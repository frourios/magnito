import assert from 'node:assert';
import { createHash } from 'node:crypto';
import {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminSetUserPasswordCommand,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  ForgotPasswordCommand,
  GetTokensFromRefreshTokenCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  RevokeTokenCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ulid } from 'ulid';
import { expect, test } from 'vitest';
import { clientSecretHash } from '../../server/service/clientSecret';
import { cognitoClient } from '../../server/service/cognito';
import { prismaClient } from '../../server/service/prismaClient';
import {
  DEFAULT_USER_POOL_CLIENT_ID,
  DEFAULT_USER_POOL_ID,
  PORT,
} from '../../server/service/serverEnvs';
import { brandedId } from '../../src/schemas/brandedId';
import { noCookieClient, testPassword, testUserName } from '../api/apiClient';

const createSecretClient = async () => {
  const result = await cognitoClient.send(
    new CreateUserPoolClientCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientName: `secret-${ulid()}`,
      GenerateSecret: true,
    }),
  );
  const clientId = result.UserPoolClient?.ClientId;
  const secret = result.UserPoolClient?.ClientSecret;
  assert(clientId && secret);
  return { clientId, secret };
};

test('client secret hash uses Cognito HMAC-SHA256 and base64', () => {
  expect(clientSecretHash('alice', 'client', 'secret')).toBe(
    'RTsve+FQ659UKyESgvLg9GYmZEL+QjzQsW/OjL77/b0=',
  );
});

// oxlint-disable-next-line complexity
test('a secret client requires SECRET_HASH for password and refresh authentication', async () => {
  const { clientId, secret } = await createSecretClient();
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      TemporaryPassword: testPassword,
      MessageAction: 'SUPPRESS',
      UserAttributes: [{ Name: 'email', Value: `${ulid()}@example.com` }],
    }),
  );
  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      Password: testPassword,
      Permanent: true,
    }),
  );
  const auth = (hash?: string) =>
    cognitoClient.send(
      new AdminInitiateAuthCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: clientId,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: testUserName,
          PASSWORD: testPassword,
          ...(hash ? { SECRET_HASH: hash } : {}),
        },
      }),
    );

  await expect(auth()).rejects.toThrow('Client secret hash was not received.');
  await expect(auth('wrong')).rejects.toThrow('Unable to verify client secret hash.');
  const result = await auth(clientSecretHash(testUserName, clientId, secret));
  expect(result.AuthenticationResult?.IdToken).toBeTruthy();
  await expect(
    cognitoClient.send(
      new InitiateAuthCommand({
        ClientId: clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
      }),
    ),
  ).rejects.toThrow('Client secret hash was not received.');
  expect(
    (
      await cognitoClient.send(
        new InitiateAuthCommand({
          ClientId: clientId,
          AuthFlow: 'USER_PASSWORD_AUTH',
          AuthParameters: {
            USERNAME: testUserName,
            PASSWORD: testPassword,
            SECRET_HASH: clientSecretHash(testUserName, clientId, secret),
          },
        }),
      )
    ).AuthenticationResult?.IdToken,
  ).toBeTruthy();
  assert(result.AuthenticationResult?.RefreshToken);
  const refreshToken = result.AuthenticationResult.RefreshToken;

  const refresh = (hash?: string) =>
    cognitoClient.send(
      new InitiateAuthCommand({
        ClientId: clientId,
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          ...(hash ? { SECRET_HASH: hash } : {}),
        },
      }),
    );
  await expect(refresh()).rejects.toThrow('Client secret hash was not received.');
  expect(
    (await refresh(clientSecretHash(testUserName, clientId, secret))).AuthenticationResult?.IdToken,
  ).toBeTruthy();

  await expect(
    cognitoClient.send(
      new GetTokensFromRefreshTokenCommand({ ClientId: clientId, RefreshToken: refreshToken }),
    ),
  ).rejects.toThrow('Invalid client secret.');
  expect(
    (
      await cognitoClient.send(
        new GetTokensFromRefreshTokenCommand({
          ClientId: clientId,
          RefreshToken: refreshToken,
          ClientSecret: secret,
        }),
      )
    ).AuthenticationResult?.IdToken,
  ).toBeTruthy();
  await expect(
    cognitoClient.send(new RevokeTokenCommand({ ClientId: clientId, Token: refreshToken })),
  ).rejects.toThrow('Invalid client secret.');
  await cognitoClient.send(
    new RevokeTokenCommand({ ClientId: clientId, Token: refreshToken, ClientSecret: secret }),
  );
});

test('a secret client requires SecretHash during signup and password recovery', async () => {
  const { clientId, secret } = await createSecretClient();
  const email = `${ulid()}@example.com`;
  const hash = clientSecretHash(testUserName, clientId, secret);
  const signUp = (secretHash?: string) =>
    cognitoClient.send(
      new SignUpCommand({
        ClientId: clientId,
        Username: testUserName,
        Password: testPassword,
        UserAttributes: [{ Name: 'email', Value: email }],
        SecretHash: secretHash,
      }),
    );
  await expect(signUp()).rejects.toThrow('Client secret hash was not received.');
  await expect(signUp('wrong')).rejects.toThrow('Unable to verify client secret hash.');
  expect((await signUp(hash)).UserSub).toBeTruthy();

  await expect(
    cognitoClient.send(
      new ResendConfirmationCodeCommand({ ClientId: clientId, Username: testUserName }),
    ),
  ).rejects.toThrow('Client secret hash was not received.');
  await cognitoClient.send(
    new ResendConfirmationCodeCommand({
      ClientId: clientId,
      Username: testUserName,
      SecretHash: hash,
    }),
  );
  const user = await prismaClient.user.findFirstOrThrow({ where: { name: testUserName } });
  assert(user.confirmationCode);
  await expect(
    cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: clientId,
        Username: testUserName,
        ConfirmationCode: user.confirmationCode,
      }),
    ),
  ).rejects.toThrow('Client secret hash was not received.');
  await cognitoClient.send(
    new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: testUserName,
      ConfirmationCode: user.confirmationCode,
      SecretHash: hash,
    }),
  );

  await expect(
    cognitoClient.send(new ForgotPasswordCommand({ ClientId: clientId, Username: testUserName })),
  ).rejects.toThrow('Client secret hash was not received.');
  await cognitoClient.send(
    new ForgotPasswordCommand({ ClientId: clientId, Username: testUserName, SecretHash: hash }),
  );
  const resetUser = await prismaClient.user.findFirstOrThrow({ where: { name: testUserName } });
  assert(resetUser.confirmationCode);
  await expect(
    cognitoClient.send(
      new ConfirmForgotPasswordCommand({
        ClientId: clientId,
        Username: testUserName,
        ConfirmationCode: resetUser.confirmationCode,
        Password: 'New-password1!',
      }),
    ),
  ).rejects.toThrow('Client secret hash was not received.');
  await cognitoClient.send(
    new ConfirmForgotPasswordCommand({
      ClientId: clientId,
      Username: testUserName,
      ConfirmationCode: resetUser.confirmationCode,
      Password: 'New-password1!',
      SecretHash: hash,
    }),
  );
});

test('an admin password challenge requires SECRET_HASH in both requests', async () => {
  const { clientId, secret } = await createSecretClient();
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      TemporaryPassword: testPassword,
      MessageAction: 'SUPPRESS',
      UserAttributes: [{ Name: 'email', Value: `${ulid()}@example.com` }],
    }),
  );
  const hash = clientSecretHash(testUserName, clientId, secret);
  const start = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: clientId,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword, SECRET_HASH: hash },
    }),
  );
  expect(start.ChallengeName).toBe('NEW_PASSWORD_REQUIRED');
  assert(start.Session);
  const respond = (secretHash?: string) =>
    cognitoClient.send(
      new AdminRespondToAuthChallengeCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: clientId,
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        Session: start.Session,
        ChallengeResponses: {
          USERNAME: testUserName,
          NEW_PASSWORD: 'New-password1!',
          ...(secretHash ? { SECRET_HASH: secretHash } : {}),
        },
      }),
    );
  await expect(respond()).rejects.toThrow('Client secret hash was not received.');
  expect((await respond(hash)).AuthenticationResult?.IdToken).toBeTruthy();
});

// oxlint-disable-next-line complexity
test('refresh authentication hashes the sub for a pool that signs in by email', async () => {
  const pool = await cognitoClient.send(
    new CreateUserPoolCommand({ PoolName: `email-${ulid()}`, UsernameAttributes: ['email'] }),
  );
  assert(pool.UserPool?.Id);
  const client = await cognitoClient.send(
    new CreateUserPoolClientCommand({
      UserPoolId: pool.UserPool.Id,
      ClientName: `secret-${ulid()}`,
      GenerateSecret: true,
    }),
  );
  const clientId = client.UserPoolClient?.ClientId;
  const secret = client.UserPoolClient?.ClientSecret;
  assert(clientId && secret);
  const username = `user-${ulid().toLowerCase()}@example.com`;
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: pool.UserPool.Id,
      Username: username,
      TemporaryPassword: testPassword,
      MessageAction: 'SUPPRESS',
      UserAttributes: [{ Name: 'email', Value: username }],
    }),
  );
  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: pool.UserPool.Id,
      Username: username,
      Password: testPassword,
      Permanent: true,
    }),
  );
  const signedIn = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      UserPoolId: pool.UserPool.Id,
      ClientId: clientId,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: testPassword,
        SECRET_HASH: clientSecretHash(username, clientId, secret),
      },
    }),
  );
  assert(signedIn.AuthenticationResult?.RefreshToken);
  const refreshToken = signedIn.AuthenticationResult.RefreshToken;
  const user = await prismaClient.user.findFirstOrThrow({ where: { name: username } });
  const refresh = (hash: string) =>
    cognitoClient.send(
      new InitiateAuthCommand({
        ClientId: clientId,
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: { REFRESH_TOKEN: refreshToken, SECRET_HASH: hash },
      }),
    );
  await expect(refresh(clientSecretHash(username, clientId, secret))).rejects.toThrow(
    'Unable to verify client secret hash.',
  );
  expect(
    (await refresh(clientSecretHash(user.id, clientId, secret))).AuthenticationResult?.IdToken,
  ).toBeTruthy();
});

test('the OAuth token endpoint accepts client_secret_post and client_secret_basic', async () => {
  const { clientId, secret } = await createSecretClient();
  const verifier = ulid();
  const createCode = async () => {
    const socialUser = await noCookieClient['publicApi/socialUsers'].$post({
      body: {
        provider: 'Google',
        name: `user-${ulid().toLowerCase()}`,
        email: `${ulid()}@example.com`,
        codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
        userPoolClientId: brandedId.userPoolClient.maybe.parse(clientId),
      },
    });
    return socialUser.authorizationCode;
  };
  const code = await createCode();
  const post = (values: Record<string, string>, authorization?: string) =>
    fetch(`http://localhost:${PORT}/oauth2/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        ...(authorization ? { authorization } : {}),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://example.com',
        code_verifier: verifier,
        ...values,
      }),
    });
  expect((await post({ client_id: clientId })).status).toBe(401);
  expect((await post({ client_id: clientId, client_secret: 'wrong' })).status).toBe(401);
  expect((await post({ client_id: clientId }, 'Bearer invalid')).status).toBe(401);
  expect((await post({ client_id: clientId }, 'Basic invalid')).status).toBe(401);
  expect((await post({ client_id: 'missing' })).status).toBe(401);
  expect((await post({})).status).toBe(401);
  expect(
    (await post({ client_id: DEFAULT_USER_POOL_CLIENT_ID, client_secret: secret })).status,
  ).toBe(401);
  const basic = `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`;
  expect((await post({ client_id: 'wrong' }, basic)).status).toBe(401);
  expect((await post({ client_id: clientId, client_secret: secret }, basic)).status).toBe(401);

  const postResult = await post({ client_id: clientId, client_secret: secret });
  expect(postResult.status).toBe(200);
  expect((await postResult.json()).id_token).toBeTruthy();

  const nextCode = await createCode();
  const basicResult = await fetch(`http://localhost:${PORT}/oauth2/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: basic,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: nextCode,
      redirect_uri: 'https://example.com',
      code_verifier: verifier,
    }),
  });
  expect(basicResult.status).toBe(200);
  expect((await basicResult.json()).id_token).toBeTruthy();
});
