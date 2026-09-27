import assert from 'assert';
import {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminSetUserPasswordCommand,
  AssociateSoftwareTokenCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  SetUserMFAPreferenceCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { generate } from 'otplib';
import { ulid } from 'ulid';
import { expect, test } from 'vitest';
import { cognitoClient } from '../../server/service/cognito';
import { prismaClient } from '../../server/service/prismaClient';
import { DEFAULT_USER_POOL_CLIENT_ID, DEFAULT_USER_POOL_ID } from '../../server/service/serverEnvs';
import { noCookieClient, testPassword, testUserName } from '../api/apiClient';
import { createCognitoUserAndToken } from '../api/utils';

const initiate = (password: string, flow: 'ADMIN_USER_PASSWORD_AUTH' | 'ADMIN_NO_SRP_AUTH') =>
  cognitoClient.send(
    new AdminInitiateAuthCommand({
      AuthFlow: flow,
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      AuthParameters: { USERNAME: testUserName, PASSWORD: password },
    }),
  );

test('AdminInitiateAuth checks the password and issues tokens for both password flows', async () => {
  await createCognitoUserAndToken();

  await expect(initiate('Wrong-password1!', 'ADMIN_USER_PASSWORD_AUTH')).rejects.toThrow(
    'Incorrect username or password.',
  );

  for (const flow of ['ADMIN_USER_PASSWORD_AUTH', 'ADMIN_NO_SRP_AUTH'] as const) {
    const result = await initiate(testPassword, flow);
    expect(result.AuthenticationResult?.AccessToken).toBeTruthy();
    expect(result.AuthenticationResult?.IdToken).toBeTruthy();
    expect(result.AuthenticationResult?.RefreshToken).toBeTruthy();
  }

  await expect(
    cognitoClient.send(
      new AdminInitiateAuthCommand({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: DEFAULT_USER_POOL_CLIENT_ID,
        AuthParameters: { USERNAME: `missing-${ulid()}`, PASSWORD: testPassword },
      }),
    ),
  ).rejects.toThrow('Incorrect username or password.');

  await expect(
    cognitoClient.send(
      new AdminInitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: DEFAULT_USER_POOL_CLIENT_ID,
        AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
      }),
    ),
  ).rejects.toThrow('Unsupported authentication flow.');
});

test('AdminInitiateAuth rejects missing username and password parameters', async () => {
  await createCognitoUserAndToken();

  for (const authParameters of [{ PASSWORD: testPassword }, { USERNAME: testUserName }] as Record<
    string,
    string
  >[]) {
    await expect(
      cognitoClient.send(
        new AdminInitiateAuthCommand({
          AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
          UserPoolId: DEFAULT_USER_POOL_ID,
          ClientId: DEFAULT_USER_POOL_CLIENT_ID,
          AuthParameters: authParameters,
        }),
      ),
    ).rejects.toThrow('Incorrect username or password.');
  }
});

test('AdminInitiateAuth rejects other pools, clients, and disabled users', async () => {
  await createCognitoUserAndToken();

  const pool = await cognitoClient.send(new CreateUserPoolCommand({ PoolName: `pool-${ulid()}` }));
  assert(pool.UserPool?.Id);
  const client = await cognitoClient.send(
    new CreateUserPoolClientCommand({ UserPoolId: pool.UserPool.Id, ClientName: 'other-client' }),
  );
  assert(client.UserPoolClient?.ClientId);

  await expect(
    cognitoClient.send(
      new AdminInitiateAuthCommand({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        UserPoolId: pool.UserPool.Id,
        ClientId: client.UserPoolClient.ClientId,
        AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
      }),
    ),
  ).rejects.toThrow('Incorrect username or password.');

  await expect(
    cognitoClient.send(
      new AdminInitiateAuthCommand({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: client.UserPoolClient.ClientId,
        AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
      }),
    ),
  ).rejects.toThrow('Incorrect username or password.');

  await prismaClient.user.updateMany({ where: { name: testUserName }, data: { enabled: false } });
  await expect(initiate(testPassword, 'ADMIN_USER_PASSWORD_AUTH')).rejects.toThrow(
    'Incorrect username or password.',
  );
});

test('AdminInitiateAuth requires confirmation and rejects social users', async () => {
  await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.SignUp' },
    body: {
      Username: testUserName,
      Password: testPassword,
      UserAttributes: [{ Name: 'email', Value: `${ulid()}@example.com` }],
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });
  await expect(initiate(testPassword, 'ADMIN_USER_PASSWORD_AUTH')).rejects.toThrow(
    'User is not confirmed.',
  );

  const socialName = `social-${ulid().toLowerCase()}`;
  await noCookieClient['publicApi/socialUsers'].$post({
    body: {
      provider: 'Google',
      name: socialName,
      email: `${ulid()}@example.com`,
      codeChallenge: ulid(),
      userPoolClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });
  await expect(
    cognitoClient.send(
      new AdminInitiateAuthCommand({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: DEFAULT_USER_POOL_CLIENT_ID,
        AuthParameters: { USERNAME: socialName, PASSWORD: testPassword },
      }),
    ),
  ).rejects.toThrow('Incorrect username or password.');
});

test('AdminRespondToAuthChallenge changes a temporary password only once', async () => {
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      TemporaryPassword: testPassword,
      MessageAction: 'SUPPRESS',
      UserAttributes: [{ Name: 'email', Value: `${ulid()}@example.com` }],
    }),
  );

  const start = await initiate(testPassword, 'ADMIN_USER_PASSWORD_AUTH');
  expect(start.ChallengeName).toBe('NEW_PASSWORD_REQUIRED');
  assert(start.Session);

  const respond = (session: string, newPassword: string) =>
    cognitoClient.send(
      new AdminRespondToAuthChallengeCommand({
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: DEFAULT_USER_POOL_CLIENT_ID,
        Session: session,
        ChallengeResponses: { USERNAME: testUserName, NEW_PASSWORD: newPassword },
      }),
    );

  await expect(respond(ulid(), 'New-password1!')).rejects.toThrow();
  await expect(respond(start.Session, 'weak')).rejects.toThrow();

  const success = await respond(start.Session, 'New-password1!');
  expect(success.AuthenticationResult?.AccessToken).toBeTruthy();
  await expect(respond(start.Session, 'New-password1!')).rejects.toThrow();
  await expect(initiate(testPassword, 'ADMIN_USER_PASSWORD_AUTH')).rejects.toThrow();
  expect(
    (await initiate('New-password1!', 'ADMIN_USER_PASSWORD_AUTH')).AuthenticationResult,
  ).toBeTruthy();
});

test('AdminRespondToAuthChallenge verifies TOTP and rejects reused sessions', async () => {
  const token = await createCognitoUserAndToken();
  const { SecretCode } = await cognitoClient.send(
    new AssociateSoftwareTokenCommand({ AccessToken: token.AccessToken, Session: 'dummySession' }),
  );
  assert(SecretCode);
  await cognitoClient.send(
    new SetUserMFAPreferenceCommand({
      AccessToken: token.AccessToken,
      SoftwareTokenMfaSettings: { PreferredMfa: true, Enabled: true },
    }),
  );

  const start = await initiate(testPassword, 'ADMIN_USER_PASSWORD_AUTH');
  expect(start.ChallengeName).toBe('SOFTWARE_TOKEN_MFA');
  assert(start.Session);

  const respond = (session: string, code: string) =>
    cognitoClient.send(
      new AdminRespondToAuthChallengeCommand({
        ChallengeName: 'SOFTWARE_TOKEN_MFA',
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: DEFAULT_USER_POOL_CLIENT_ID,
        Session: session,
        ChallengeResponses: { USERNAME: testUserName, SOFTWARE_TOKEN_MFA_CODE: code },
      }),
    );

  const code = await generate({ secret: SecretCode });
  await expect(respond(ulid(), code)).rejects.toThrow();
  await expect(respond(start.Session, '')).rejects.toThrow();
  expect((await respond(start.Session, code)).AuthenticationResult?.RefreshToken).toBeTruthy();
  await expect(respond(start.Session, code)).rejects.toThrow();

  const staleChallenge = await initiate(testPassword, 'ADMIN_USER_PASSWORD_AUTH');
  assert(staleChallenge.Session);

  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      Password: 'Temporary-password1!',
      Permanent: false,
    }),
  );
  await expect(respond(staleChallenge.Session, code)).rejects.toThrow('User is not confirmed.');
  const newPasswordChallenge = await initiate('Temporary-password1!', 'ADMIN_USER_PASSWORD_AUTH');
  assert(newPasswordChallenge.Session);
  const next = await cognitoClient.send(
    new AdminRespondToAuthChallengeCommand({
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      Session: newPasswordChallenge.Session,
      ChallengeResponses: { USERNAME: testUserName, NEW_PASSWORD: 'Changed-password1!' },
    }),
  );
  expect(next.ChallengeName).toBe('SOFTWARE_TOKEN_MFA');
  assert(next.Session);
  expect((await respond(next.Session, code)).AuthenticationResult?.AccessToken).toBeTruthy();
});
