import { createHash, randomBytes } from 'crypto';
/* oxlint-disable complexity */
import { ulid } from 'ulid';
import { brandedId } from '../../../../src/schemas/brandedId';
import type {
  SocialUserRequestTokensVal,
  SocialUserResponseTokensVal,
} from '../../../../src/schemas/user';
import { cognitoAssert } from '../../../service/cognitoAssert';
import { EXPIRES_SEC } from '../../../service/constants';
import { transaction } from '../../../service/transaction';
import { validateManagedLoginRequest } from '../../userPool/service/managedLoginConfig';
import { userPoolQuery } from '../../userPool/store/userPoolQuery';
import { genTokens } from '../service/genTokens';
import { userQuery } from '../store/userQuery';
import { userTokenCommand } from '../store/userTokenCommand';

type AuthorizationRequest = {
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'plain' | 'S256';
  username: string;
  password: string;
};

export const managedLoginUseCase = {
  authorize: async (input: AuthorizationRequest): Promise<string> => {
    const config = await validateManagedLoginRequest(input);
    cognitoAssert(config?.allowPassword, 'Incorrect username or password.');

    return transaction('RepeatableRead', async (tx) => {
      const client = await tx.userPoolClient.findUniqueOrThrow({ where: { id: input.clientId } });
      const user = await userQuery
        .findByNameInPool(tx, input.username, client.userPoolId)
        .catch(() => null);
      cognitoAssert(
        user?.kind === 'cognito' && user.enabled && user.password === input.password,
        'Incorrect username or password.',
      );
      cognitoAssert(user.status === 'CONFIRMED', 'User is not confirmed.');
      // A password challenge cannot be completed by this form.
      cognitoAssert(!user.mfaSettingList?.length, 'Unsupported authentication flow.');

      const code = randomBytes(32).toString('base64url');
      await tx.oAuthAuthorizationCode.create({
        data: {
          code,
          userId: user.id,
          clientId: client.id,
          redirectUri: input.redirectUri,
          scope: input.scope,
          codeChallenge: input.codeChallenge,
          codeChallengeMethod: input.codeChallengeMethod,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
      return code;
    });
  },
  exchangeCode: (input: SocialUserRequestTokensVal): Promise<SocialUserResponseTokensVal | null> =>
    transaction('RepeatableRead', async (tx) => {
      const grant = await tx.oAuthAuthorizationCode.findUnique({ where: { code: input.code } });
      if (!grant) return null;
      cognitoAssert(
        grant.expiresAt > new Date() &&
          grant.clientId === input.client_id &&
          grant.redirectUri === input.redirect_uri,
        'Incorrect username or password.',
      );
      if (grant.codeChallenge) {
        const challenge =
          grant.codeChallengeMethod === 'S256'
            ? createHash('sha256').update(input.code_verifier).digest('base64url')
            : input.code_verifier;
        cognitoAssert(grant.codeChallenge === challenge, 'Incorrect username or password.');
      }

      // Deleting the grant inside the transaction makes the code single use.
      await tx.oAuthAuthorizationCode.delete({ where: { code: grant.code } });
      const user = await userQuery.findById(tx, brandedId.cognitoUser.maybe.parse(grant.userId));
      const pool = await userPoolQuery.findById(tx, user.userPoolId);
      const client = await userPoolQuery.findClientById(tx, grant.clientId);
      const jwks = await userPoolQuery.findJwks(tx, user.userPoolId);
      const tokens = genTokens({
        privateKey: pool.privateKey,
        userPoolClientId: client.id,
        jwks,
        user,
      });
      const refreshToken = ulid();
      await userTokenCommand.createTokens(tx, user.id, { ...tokens, RefreshToken: refreshToken });
      return {
        id_token: tokens.IdToken,
        access_token: tokens.AccessToken,
        refresh_token: refreshToken,
        expires_in: EXPIRES_SEC,
        token_type: 'Bearer',
      };
    }),
};
