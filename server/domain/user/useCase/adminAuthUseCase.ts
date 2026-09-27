import { ulid } from 'ulid';
import type {
  AdminInitiateAuthTarget,
  AdminRespondToAuthChallengeTarget,
} from '../../../../src/schemas/auth';
import type { CognitoUserDto } from '../../../../src/schemas/user';
import type { UserPoolClientDto, UserPoolDto } from '../../../../src/schemas/userPool';
import { userPoolQuery } from '../../../domain/userPool/store/userPoolQuery';
import type { Prisma } from '../../../prisma/client';
import { catchCognitoErr, cognitoAssert } from '../../../service/cognitoAssert';
import type { AdminChallengeTokenKind } from '../../../service/constants';
import { EXPIRES_SEC } from '../../../service/constants';
import { genJwks } from '../../../service/privateKey';
import { transaction } from '../../../service/transaction';
import { adminMethod } from '../model/adminMethod';
import { mfaMethod } from '../model/mfaMethod';
import { genTokens } from '../service/genTokens';
import { userCommand } from '../store/userCommand';
import { userQuery } from '../store/userQuery';
import { userTokenCommand } from '../store/userTokenCommand';
import { userTokenQuery } from '../store/userTokenQuery';

const createChallenge = async (
  tx: Prisma.TransactionClient,
  user: CognitoUserDto,
  client: UserPoolClientDto,
  kind: AdminChallengeTokenKind,
): Promise<AdminInitiateAuthTarget['resBody']> => {
  const session = ulid();

  await userTokenCommand.create(tx, user.id, kind, `${client.id}:${session}`);

  return {
    ChallengeName: kind === 'admin_new_password' ? 'NEW_PASSWORD_REQUIRED' : 'SOFTWARE_TOKEN_MFA',
    ChallengeParameters: {},
    Session: session,
  };
};

const issueTokens = async (
  tx: Prisma.TransactionClient,
  user: CognitoUserDto,
  pool: UserPoolDto,
  client: UserPoolClientDto,
): Promise<AdminInitiateAuthTarget['resBody']> => {
  const jwks = await genJwks(pool.privateKey);
  const tokens = genTokens({
    privateKey: pool.privateKey,
    userPoolClientId: client.id,
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
  };
};

const findUserAndClient = async (
  tx: Prisma.TransactionClient,
  username: string,
  poolId: string | undefined,
  clientId: string | undefined,
): Promise<{ user: CognitoUserDto; pool: UserPoolDto; client: UserPoolClientDto }> => {
  cognitoAssert(poolId && clientId, 'Incorrect username or password.');
  const pool = await userPoolQuery.findById(tx, poolId);
  const client = await userPoolQuery.findClientById(tx, clientId);
  const user = await userQuery
    .findByNameInPool(tx, username, pool.id)
    .catch(catchCognitoErr('Incorrect username or password.'));

  cognitoAssert(
    user.kind === 'cognito' && user.enabled && client.userPoolId === pool.id,
    'Incorrect username or password.',
  );

  return { user, pool, client };
};

export const adminAuthUseCase = {
  initiate: (
    req: AdminInitiateAuthTarget['reqBody'],
  ): Promise<AdminInitiateAuthTarget['resBody']> =>
    transaction('RepeatableRead', async (tx) => {
      cognitoAssert(
        req.AuthFlow === 'ADMIN_USER_PASSWORD_AUTH' || req.AuthFlow === 'ADMIN_NO_SRP_AUTH',
        'Unsupported authentication flow.',
      );

      cognitoAssert(req.AuthParameters, 'Incorrect username or password.');
      const username = req.AuthParameters.USERNAME;
      cognitoAssert(username, 'Incorrect username or password.');
      const password = req.AuthParameters.PASSWORD;

      const { user, pool, client } = await findUserAndClient(
        tx,
        username,
        req.UserPoolId,
        req.ClientId,
      );
      cognitoAssert(user.password === password, 'Incorrect username or password.');

      if (user.status === 'FORCE_CHANGE_PASSWORD') {
        return createChallenge(tx, user, client, 'admin_new_password');
      }

      cognitoAssert(user.status === 'CONFIRMED', 'User is not confirmed.');

      if (user.mfaSettingList?.includes('SOFTWARE_TOKEN_MFA')) {
        return createChallenge(tx, user, client, 'admin_password_mfa');
      }

      return issueTokens(tx, user, pool, client);
    }),
  respond: (
    req: AdminRespondToAuthChallengeTarget['reqBody'],
  ): Promise<AdminRespondToAuthChallengeTarget['resBody']> =>
    transaction('RepeatableRead', async (tx) => {
      cognitoAssert(
        req.ChallengeName === 'NEW_PASSWORD_REQUIRED' || req.ChallengeName === 'SOFTWARE_TOKEN_MFA',
        'Unsupported authentication flow.',
      );

      const responses = req.ChallengeResponses;
      cognitoAssert(responses, 'Invalid verification code provided, please try again.');
      const username = responses.USERNAME;
      cognitoAssert(username, 'Invalid verification code provided, please try again.');
      cognitoAssert(req.Session, 'Invalid verification code provided, please try again.');

      const { user, pool, client } = await findUserAndClient(
        tx,
        username,
        req.UserPoolId,
        req.ClientId,
      );

      if (req.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        await userTokenQuery.validateAuthSession(
          tx,
          user.id,
          client.id,
          req.Session,
          'admin_new_password',
        );

        cognitoAssert(user.status === 'FORCE_CHANGE_PASSWORD', 'User is not confirmed.');
        const newPassword = responses.NEW_PASSWORD;
        cognitoAssert(newPassword, 'Incorrect username or password.');

        const updated = await userCommand.save(
          tx,
          adminMethod.setUserPassword(user, {
            UserPoolId: pool.id,
            Username: user.name,
            Password: newPassword,
            Permanent: true,
          }),
        );

        await userTokenCommand.revokeByToken(tx, `${client.id}:${req.Session}`);

        if (updated.mfaSettingList?.includes('SOFTWARE_TOKEN_MFA')) {
          return createChallenge(tx, updated, client, 'admin_password_mfa');
        }

        return issueTokens(tx, updated, pool, client);
      }

      await userTokenQuery.validateAuthSession(
        tx,
        user.id,
        client.id,
        req.Session,
        'admin_password_mfa',
      );
      cognitoAssert(user.status === 'CONFIRMED', 'User is not confirmed.');
      mfaMethod.verify(user, responses.SOFTWARE_TOKEN_MFA_CODE);
      await userTokenCommand.revokeByToken(tx, `${client.id}:${req.Session}`);

      return issueTokens(tx, user, pool, client);
    }),
};
