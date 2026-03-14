import assert from 'assert';
import type {
  RefreshTokenAuthTarget,
  RespondToAuthChallengeTarget,
  UserSrpAuthTarget,
} from 'schemas/signIn';
import { userPoolQuery } from 'server/domain/userPool/store/userPoolQuery';
import { cognitoAssert } from 'server/service/cognitoAssert';
import { EXPIRES_SEC } from 'server/service/constants';
import { transaction } from 'server/service/transaction';
import { mfaMethod } from '../model/mfaMethod';
import { signInMethod } from '../model/signInMethod';
import { genTokens } from '../service/genTokens';
import { isEmailVerified } from '../service/isEmailVerified';
import { userCommand } from '../store/userCommand';
import { userQuery } from '../store/userQuery';

export const signInUseCase = {
  userSrpAuth: (req: UserSrpAuthTarget['reqBody']): Promise<UserSrpAuthTarget['resBody']> =>
    transaction(async (tx) => {
      const user = await userQuery.findByName(tx, req.AuthParameters.USERNAME).catch(() => null);

      cognitoAssert(user, 'Incorrect username or password.');
      assert(user.kind === 'cognito');

      const { userWithChallenge, ChallengeParameters } = signInMethod.createChallenge(
        user,
        req.AuthParameters,
      );

      await userCommand.save(tx, userWithChallenge);

      return { ChallengeName: 'PASSWORD_VERIFIER', ChallengeParameters };
    }),
  refreshTokenAuth: (
    req: RefreshTokenAuthTarget['reqBody'],
  ): Promise<RefreshTokenAuthTarget['resBody']> =>
    transaction(async (tx) => {
      const user = await userQuery.findByRefreshToken(tx, req.AuthParameters.REFRESH_TOKEN);
      const pool = await userPoolQuery.findById(tx, user.userPoolId);
      const poolClient = await userPoolQuery.findClientById(tx, req.ClientId);
      const jwks = await userPoolQuery.findJwks(tx, user.userPoolId);

      assert(pool.id === poolClient.userPoolId);

      return {
        AuthenticationResult: {
          ...genTokens({
            privateKey: pool.privateKey,
            userPoolClientId: poolClient.id,
            jwks,
            user,
          }),
          ExpiresIn: EXPIRES_SEC,
          TokenType: 'Bearer',
        },
        ChallengeParameters: {},
      };
    }),
  respondToAuthChallenge: (
    req: RespondToAuthChallengeTarget['reqBody'],
  ): Promise<RespondToAuthChallengeTarget['resBody']> =>
    transaction(async (tx) => {
      const user = await userQuery.findByName(tx, req.ChallengeResponses.USERNAME);
      const pool = await userPoolQuery.findById(tx, user.userPoolId);
      const poolClient = await userPoolQuery.findClientById(tx, req.ClientId);
      const jwks = await userPoolQuery.findJwks(tx, user.userPoolId);

      assert(pool.id === poolClient.userPoolId);
      assert(user.kind === 'cognito');

      if (req.ChallengeName === 'PASSWORD_VERIFIER') {
        assert(user.challenge);
        assert(user.challenge.secretBlock === req.ChallengeResponses.PASSWORD_CLAIM_SECRET_BLOCK);

        cognitoAssert(isEmailVerified(user), 'User is not confirmed.');

        if (user.mfaSettingList?.some((s) => s === 'SOFTWARE_TOKEN_MFA')) {
          const updated = signInMethod.challengeMfa(user, {
            timestamp: req.ChallengeResponses.TIMESTAMP,
            clientSignature: req.ChallengeResponses.PASSWORD_CLAIM_SIGNATURE,
          });

          await userCommand.save(tx, updated);

          return {
            ChallengeName: 'SOFTWARE_TOKEN_MFA',
            Session: 'magnito_dummy_session',
            ChallengeParameters: {},
          };
        }

        const tokens = signInMethod.srpAuth({
          user,
          timestamp: req.ChallengeResponses.TIMESTAMP,
          clientSignature: req.ChallengeResponses.PASSWORD_CLAIM_SIGNATURE,
          jwks,
          pool,
          poolClient,
        });

        return {
          AuthenticationResult: {
            ...tokens,
            ExpiresIn: 3600,
            RefreshToken: user.refreshToken,
            TokenType: 'Bearer',
          },
          ChallengeParameters: {},
        };
      } else {
        const updated = mfaMethod.verify(user, req.ChallengeResponses.SOFTWARE_TOKEN_MFA_CODE);

        assert(updated.srpAuth);

        const tokens = signInMethod.srpAuth({
          user,
          timestamp: updated.srpAuth.timestamp,
          clientSignature: updated.srpAuth.clientSignature,
          jwks,
          pool,
          poolClient,
        });

        return {
          AuthenticationResult: {
            ...tokens,
            ExpiresIn: 3600,
            RefreshToken: user.refreshToken,
            TokenType: 'Bearer',
          },
          ChallengeParameters: {},
        };
      }
    }),
};
