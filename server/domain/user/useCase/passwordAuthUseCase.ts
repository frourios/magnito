import assert from 'assert';
import { ulid } from 'ulid';
import type {
  RespondToAuthChallengeTarget,
  UserPasswordAuthTarget,
} from '../../../../src/schemas/signIn';
import type { CognitoUserDto } from '../../../../src/schemas/user';
import type { JwksDto, UserPoolClientDto, UserPoolDto } from '../../../../src/schemas/userPool';
import { userPoolQuery } from '../../../domain/userPool/store/userPoolQuery';
import type { Prisma } from '../../../prisma/client';
import { catchCognitoErr, cognitoAssert } from '../../../service/cognitoAssert';
import { EXPIRES_SEC } from '../../../service/constants';
import { transaction } from '../../../service/transaction';
import { mfaMethod } from '../model/mfaMethod';
import { genTokens } from '../service/genTokens';
import { userQuery } from '../store/userQuery';
import { userTokenCommand } from '../store/userTokenCommand';
import { userTokenQuery } from '../store/userTokenQuery';

export const passwordAuthUseCase = {
  initiate: (req: UserPasswordAuthTarget['reqBody']): Promise<UserPasswordAuthTarget['resBody']> =>
    transaction('RepeatableRead', async (tx) => {
      const user = await userQuery
        .findByName(tx, req.AuthParameters.USERNAME)
        .catch(catchCognitoErr('Incorrect username or password.'));

      cognitoAssert(
        user.kind === 'cognito' && user.password === req.AuthParameters.PASSWORD,
        'Incorrect username or password.',
      );

      const pool = await userPoolQuery.findById(tx, user.userPoolId);
      const poolClient = await userPoolQuery.findClientById(tx, req.ClientId);

      assert(pool.id === poolClient.userPoolId);
      cognitoAssert(user.status === 'CONFIRMED', 'User is not confirmed.');

      if (user.mfaSettingList?.some((s) => s === 'SOFTWARE_TOKEN_MFA')) {
        const session = ulid();

        await userTokenCommand.create(tx, user.id, 'password_mfa', `${poolClient.id}:${session}`);

        return {
          ChallengeName: 'SOFTWARE_TOKEN_MFA',
          Session: session,
          ChallengeParameters: {},
        };
      }

      const jwks = await userPoolQuery.findJwks(tx, user.userPoolId);
      const tokens = genTokens({
        privateKey: pool.privateKey,
        userPoolClientId: poolClient.id,
        jwks,
        user,
      });
      const refreshToken = ulid();

      await userTokenCommand.createTokens(tx, user.id, { ...tokens, RefreshToken: refreshToken });

      return {
        AuthenticationResult: {
          ...tokens,
          ExpiresIn: EXPIRES_SEC,
          RefreshToken: refreshToken,
          TokenType: 'Bearer',
        },
        ChallengeParameters: {},
      };
    }),
  respondToMfa: async (
    tx: Prisma.TransactionClient,
    user: CognitoUserDto,
    pool: UserPoolDto,
    poolClient: UserPoolClientDto,
    jwks: JwksDto,
    req: Extract<RespondToAuthChallengeTarget['reqBody'], { ChallengeName: 'SOFTWARE_TOKEN_MFA' }>,
  ): Promise<RespondToAuthChallengeTarget['resBody']> => {
    await userTokenQuery.validatePasswordMfaSession(tx, user.id, poolClient.id, req.Session);
    mfaMethod.verify(user, req.ChallengeResponses.SOFTWARE_TOKEN_MFA_CODE);

    const tokens = genTokens({
      privateKey: pool.privateKey,
      userPoolClientId: poolClient.id,
      jwks,
      user,
    });
    const refreshToken = ulid();

    await userTokenCommand.revokeByToken(tx, `${poolClient.id}:${req.Session}`);
    await userTokenCommand.createTokens(tx, user.id, { ...tokens, RefreshToken: refreshToken });

    return {
      AuthenticationResult: {
        ...tokens,
        ExpiresIn: EXPIRES_SEC,
        RefreshToken: refreshToken,
        TokenType: 'Bearer',
      },
      ChallengeParameters: {},
    };
  },
};
