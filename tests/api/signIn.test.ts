import assert from 'assert';
import {
  AdminCreateUserCommand,
  AssociateSoftwareTokenCommand,
  SetUserMFAPreferenceCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { generate } from 'otplib';
import { ulid } from 'ulid';
import { expect, test } from 'vitest';
import { calcClientSignature } from '../../server/domain/user/service/srp/calcClientSignature';
import { calculateSrpA } from '../../server/domain/user/service/srp/calcSrpA';
import { fromBuffer } from '../../server/domain/user/service/srp/util';
import { cognitoClient } from '../../server/service/cognito';
import { DEFAULT_USER_POOL_CLIENT_ID, DEFAULT_USER_POOL_ID } from '../../server/service/serverEnvs';
import { lowLevelNoCookieClient, noCookieClient, testPassword, testUserName } from './apiClient';
import { createCognitoUserAndToken } from './utils';

test('USER_PASSWORD_AUTH returns tokens only for a confirmed user with the correct password', async () => {
  await createCognitoUserAndToken();

  const request = (username: string, password: string) =>
    lowLevelNoCookieClient.$post({
      headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
      body: {
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: { USERNAME: username, PASSWORD: password },
        ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      },
    });

  const unknownUser = await request(`missing-${ulid()}`, testPassword);
  expect(unknownUser.raw?.status).toBe(400);
  expect(unknownUser.raw?.headers.get('x-amzn-errormessage')).toBe(
    'Incorrect username or password.',
  );

  const wrongPassword = await request(testUserName, 'Wrong-password1!');
  expect(wrongPassword.raw?.status).toBe(400);
  expect(wrongPassword.raw?.headers.get('x-amzn-errormessage')).toBe(
    'Incorrect username or password.',
  );

  const success = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: {
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });
  assert('AuthenticationResult' in success);
  assert(success.AuthenticationResult);
  expect(success.AuthenticationResult.AccessToken).toBeTruthy();
  expect(success.AuthenticationResult.IdToken).toBeTruthy();
  expect(success.AuthenticationResult.RefreshToken).toBeTruthy();

  const user = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.GetUser' },
    body: { AccessToken: success.AuthenticationResult.AccessToken },
  });
  expect(user.Username).toBe(testUserName);
});

test('USER_PASSWORD_AUTH requires confirmation', async () => {
  const username = `unconfirmed-${ulid().toLowerCase()}`;

  await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.SignUp' },
    body: {
      Username: username,
      Password: testPassword,
      UserAttributes: [{ Name: 'email', Value: `${ulid()}@example.com` }],
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  const result = await lowLevelNoCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: {
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: username, PASSWORD: testPassword },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  expect(result.raw?.status).toBe(400);
  expect(result.raw?.headers.get('x-amzn-errormessage')).toBe('User is not confirmed.');
});

test('USER_PASSWORD_AUTH does not issue tokens for a temporary password', async () => {
  const username = `temporary-${ulid().toLowerCase()}`;

  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: username,
      TemporaryPassword: testPassword,
      MessageAction: 'SUPPRESS',
      UserAttributes: [{ Name: 'email', Value: `${ulid()}@example.com` }],
    }),
  );

  const result = await lowLevelNoCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: {
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: username, PASSWORD: testPassword },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  expect(result.raw?.status).toBe(400);
});

test('USER_PASSWORD_AUTH rejects a social user', async () => {
  const username = `social-${ulid().toLowerCase()}`;

  await noCookieClient['publicApi/socialUsers'].$post({
    body: {
      provider: 'Google',
      name: username,
      email: `${ulid()}@example.com`,
      codeChallenge: ulid(),
      userPoolClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  const result = await lowLevelNoCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: {
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: username, PASSWORD: testPassword },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  expect(result.raw?.status).toBe(400);
  expect(result.raw?.headers.get('x-amzn-errormessage')).toBe('Incorrect username or password.');
});

test('USER_PASSWORD_AUTH completes a TOTP challenge once', async () => {
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

  const start = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: {
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });
  assert('Session' in start);
  expect(start.ChallengeName).toBe('SOFTWARE_TOKEN_MFA');

  const respond = (session: string, code: string) =>
    lowLevelNoCookieClient.$post({
      headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge' },
      body: {
        ChallengeName: 'SOFTWARE_TOKEN_MFA',
        ChallengeResponses: { SOFTWARE_TOKEN_MFA_CODE: code, USERNAME: testUserName },
        Session: session,
        ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      },
    });

  const code = await generate({ secret: SecretCode });
  expect((await respond(ulid(), code)).raw?.status).toBe(400);
  expect((await respond(start.Session, '')).raw?.status).toBe(400);

  const success = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge' },
    body: {
      ChallengeName: 'SOFTWARE_TOKEN_MFA',
      ChallengeResponses: { SOFTWARE_TOKEN_MFA_CODE: code, USERNAME: testUserName },
      Session: start.Session,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });
  assert('AuthenticationResult' in success);
  expect(success.AuthenticationResult?.RefreshToken).toBeTruthy();
  expect((await respond(start.Session, code)).raw?.status).toBe(400);
});

test('signIn', async () => {
  await createCognitoUserAndToken();

  const { a, A } = calculateSrpA();
  const res1 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: {
      AuthFlow: 'USER_SRP_AUTH',
      AuthParameters: { USERNAME: testUserName, SRP_A: A.toString('hex') },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('ChallengeParameters' in res1);
  assert(res1.ChallengeParameters);
  const secretBlock = res1.ChallengeParameters.SECRET_BLOCK;
  const signature = calcClientSignature({
    secretBlock,
    username: testUserName,
    password: testPassword,
    salt: res1.ChallengeParameters.SALT,
    timestamp: 'Thu Jan 01 00:00:00 UTC 1970',
    A: A.toString('hex'),
    a: fromBuffer(a),
    B: res1.ChallengeParameters.SRP_B,
  });

  const res2 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge' },
    body: {
      ChallengeName: 'PASSWORD_VERIFIER',
      ChallengeResponses: {
        PASSWORD_CLAIM_SECRET_BLOCK: secretBlock,
        PASSWORD_CLAIM_SIGNATURE: signature,
        TIMESTAMP: 'Thu Jan 01 00:00:00 UTC 1970',
        USERNAME: testUserName,
      },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('AuthenticationResult' in res2);
  assert(res2.AuthenticationResult);
  assert(res2.AuthenticationResult.AccessToken);
  assert('RefreshToken' in res2.AuthenticationResult);
  assert(res2.AuthenticationResult.RefreshToken);

  await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.GetUser' },
    body: { AccessToken: res2.AuthenticationResult.AccessToken },
  });

  await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: { REFRESH_TOKEN: res2.AuthenticationResult.RefreshToken },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  const res3 = await lowLevelNoCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.RevokeToken' },
    body: {
      Token: res2.AuthenticationResult.RefreshToken,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  expect(res3.ok).toBeTruthy();

  const revokeAgain = await lowLevelNoCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.RevokeToken' },
    body: {
      Token: res2.AuthenticationResult.RefreshToken,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  expect(revokeAgain.ok).toBeTruthy();
});

test('GetTokensFromRefreshToken', async () => {
  await createCognitoUserAndToken();

  const { a, A } = calculateSrpA();
  const res1 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: {
      AuthFlow: 'USER_SRP_AUTH',
      AuthParameters: { USERNAME: testUserName, SRP_A: A.toString('hex') },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('ChallengeParameters' in res1);
  assert(res1.ChallengeParameters);
  const secretBlock = res1.ChallengeParameters.SECRET_BLOCK;
  const signature = calcClientSignature({
    secretBlock,
    username: testUserName,
    password: testPassword,
    salt: res1.ChallengeParameters.SALT,
    timestamp: 'Thu Jan 01 00:00:00 UTC 1970',
    A: A.toString('hex'),
    a: fromBuffer(a),
    B: res1.ChallengeParameters.SRP_B,
  });

  const res2 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge' },
    body: {
      ChallengeName: 'PASSWORD_VERIFIER',
      ChallengeResponses: {
        PASSWORD_CLAIM_SECRET_BLOCK: secretBlock,
        PASSWORD_CLAIM_SIGNATURE: signature,
        TIMESTAMP: 'Thu Jan 01 00:00:00 UTC 1970',
        USERNAME: testUserName,
      },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('AuthenticationResult' in res2);
  assert(res2.AuthenticationResult);
  assert('RefreshToken' in res2.AuthenticationResult);
  assert(res2.AuthenticationResult.RefreshToken);

  const res3 = await noCookieClient.$post({
    headers: {
      'x-amz-target': 'AWSCognitoIdentityProviderService.GetTokensFromRefreshToken',
    },
    body: {
      RefreshToken: res2.AuthenticationResult.RefreshToken,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('AuthenticationResult' in res3);
  assert(res3.AuthenticationResult);
  expect(res3.AuthenticationResult.AccessToken).toBeTruthy();
  expect(res3.AuthenticationResult.IdToken).toBeTruthy();
  expect(res3.AuthenticationResult.ExpiresIn).toBe(3600);
  expect(res3.AuthenticationResult.TokenType).toBe('Bearer');
});

test('signIn with TOTP', async () => {
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

  const { a, A } = calculateSrpA();
  const res1 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: {
      AuthFlow: 'USER_SRP_AUTH',
      AuthParameters: { USERNAME: testUserName, SRP_A: A.toString('hex') },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('ChallengeParameters' in res1);
  assert(res1.ChallengeParameters);
  const secretBlock = res1.ChallengeParameters.SECRET_BLOCK;
  const signature = calcClientSignature({
    secretBlock,
    username: testUserName,
    password: testPassword,
    salt: res1.ChallengeParameters.SALT,
    timestamp: 'Thu Jan 01 00:00:00 UTC 1970',
    A: A.toString('hex'),
    a: fromBuffer(a),
    B: res1.ChallengeParameters.SRP_B,
  });

  const res2 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge' },
    body: {
      ChallengeName: 'PASSWORD_VERIFIER',
      ChallengeResponses: {
        PASSWORD_CLAIM_SECRET_BLOCK: secretBlock,
        PASSWORD_CLAIM_SIGNATURE: signature,
        TIMESTAMP: 'Thu Jan 01 00:00:00 UTC 1970',
        USERNAME: testUserName,
      },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('Session' in res2);
  assert(res2.Session);

  const res3 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge' },
    body: {
      ChallengeName: 'SOFTWARE_TOKEN_MFA',
      ChallengeResponses: {
        SOFTWARE_TOKEN_MFA_CODE: await generate({ secret: SecretCode }),
        USERNAME: testUserName,
      },
      Session: res2.Session,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('AuthenticationResult' in res3);
  assert(res3.AuthenticationResult);
  assert(res3.AuthenticationResult.AccessToken);
  assert('RefreshToken' in res3.AuthenticationResult);
  assert(res3.AuthenticationResult.RefreshToken);
});
