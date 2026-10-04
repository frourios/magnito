import { assertClientSecret, assertClientSecretHash } from './clientSecret';
import { cognitoAssert } from './cognitoAssert';
import { prismaClient } from './prismaClient';

const usernameHashActions = new Set([
  'SignUp',
  'ConfirmSignUp',
  'ResendConfirmationCode',
  'ForgotPassword',
  'ConfirmForgotPassword',
]);

const authHashActions = new Set(['InitiateAuth', 'AdminInitiateAuth']);
const challengeHashActions = new Set(['RespondToAuthChallenge', 'AdminRespondToAuthChallenge']);

const fields = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const stringField = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

// oxlint-disable-next-line complexity
export const validateClientSecretRequest = async (
  target: string,
  body: Record<string, unknown>,
): Promise<void> => {
  const action = target.slice(target.lastIndexOf('.') + 1);
  if (
    !usernameHashActions.has(action) &&
    !authHashActions.has(action) &&
    !challengeHashActions.has(action) &&
    action !== 'RevokeToken' &&
    action !== 'GetTokensFromRefreshToken'
  )
    return;

  const clientId = stringField(body.ClientId);
  if (action === 'RevokeToken' || action === 'GetTokensFromRefreshToken') {
    cognitoAssert(clientId, 'Incorrect username or password.');
  }
  if (!clientId) return;

  if (action === 'RevokeToken' || action === 'GetTokensFromRefreshToken') {
    await assertClientSecret(prismaClient, clientId, stringField(body.ClientSecret));
    return;
  }

  if (usernameHashActions.has(action)) {
    const username = stringField(body.Username);
    if (username) {
      await assertClientSecretHash(prismaClient, clientId, username, stringField(body.SecretHash));
    }
    return;
  }

  const params = fields(
    authHashActions.has(action) ? body.AuthParameters : body.ChallengeResponses,
  );
  let username = stringField(params.USERNAME);
  if (action === 'InitiateAuth' && body.AuthFlow === 'REFRESH_TOKEN_AUTH') {
    const refreshToken = stringField(params.REFRESH_TOKEN);
    if (refreshToken) {
      const token = await prismaClient.userToken.findFirst({
        where: { token: refreshToken, kind: 'refresh', revoked: false },
        include: { user: { include: { UserPool: true } } },
      });
      cognitoAssert(token, 'Incorrect username or password.');
      username = token.user.UserPool.usernameAttributes.length ? token.user.id : token.user.name;
    }
  }
  if (username) {
    await assertClientSecretHash(prismaClient, clientId, username, stringField(params.SECRET_HASH));
  }
};
