import assert from 'assert';
import {
  AdminCreateUserCommand,
  AdminDeleteUserAttributesCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminUserGlobalSignOutCommand,
  GetUserCommand,
  UserStatusType,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from 'server/service/cognito';
import { prismaClient } from 'server/service/prismaClient';
import {
  DEFAULT_USER_POOL_CLIENT_ID,
  DEFAULT_USER_POOL_ID,
  PORT,
  REGION,
} from 'server/service/serverEnvs';
import { createUserClient, testPassword, testUserName } from 'tests/api/apiClient';
import {
  createCognitoUserAndToken,
  createSocialUserAndToken,
  fetchMailBodyAndTrash,
  inbucketClient,
} from 'tests/api/utils';
import { ulid } from 'ulid';
import { expect, test } from 'vitest';

test(`${AdminCreateUserCommand.name} - specify TemporaryPassword`, async () => {
  const email = `${ulid()}@example.com`;

  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      TemporaryPassword: `TmpPass-${Date.now()}`,
      MessageAction: 'SUPPRESS',
      UserAttributes: [{ Name: 'email', Value: email }],
    }),
  );

  const mailbox = await inbucketClient.mailbox(email);

  expect(mailbox).toHaveLength(0);

  const res1 = await cognitoClient.send(
    new AdminGetUserCommand({ UserPoolId: DEFAULT_USER_POOL_ID, Username: testUserName }),
  );

  expect(res1.UserStatus).toBe(UserStatusType.FORCE_CHANGE_PASSWORD);

  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Permanent: true,
      Username: testUserName,
      Password: testPassword,
    }),
  );

  const res2 = await cognitoClient.send(
    new AdminGetUserCommand({ UserPoolId: DEFAULT_USER_POOL_ID, Username: testUserName }),
  );

  expect(res2.UserStatus).toBe(UserStatusType.CONFIRMED);

  const tokens = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
    }),
  );

  expect(tokens.AuthenticationResult).toBeTruthy();
});

test(`${AdminCreateUserCommand.name} - unset TemporaryPassword`, async () => {
  const email = `${ulid()}@example.com`;

  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      UserAttributes: [{ Name: 'email', Value: email }],
    }),
  );

  const message1 = await fetchMailBodyAndTrash(email);

  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      MessageAction: 'RESEND',
      UserAttributes: [{ Name: 'email', Value: email }],
    }),
  );

  const message2 = await fetchMailBodyAndTrash(email);

  expect(message1).toBe(message2);

  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      Password: testPassword,
    }),
  );

  const res = await cognitoClient.send(
    new AdminGetUserCommand({ UserPoolId: DEFAULT_USER_POOL_ID, Username: testUserName }),
  );

  expect(res.UserStatus).toBe(UserStatusType.FORCE_CHANGE_PASSWORD);
});

test(`${AdminDeleteUserCommand.name} - cognito`, async () => {
  const userClient = await createCognitoUserAndToken().then(createUserClient);

  await cognitoClient.send(
    new AdminDeleteUserCommand({ UserPoolId: DEFAULT_USER_POOL_ID, Username: testUserName }),
  );

  await expect(userClient['privateApi/me'].$get()).rejects.toThrow();
});

test(`${AdminDeleteUserCommand.name} - social`, async () => {
  const userClient = await createSocialUserAndToken().then(createUserClient);

  await cognitoClient.send(
    new AdminDeleteUserCommand({ UserPoolId: DEFAULT_USER_POOL_ID, Username: testUserName }),
  );

  await expect(userClient['privateApi/me'].$get()).rejects.toThrow();
});

test(AdminUpdateUserAttributesCommand.name, async () => {
  const newEmail = `${ulid()}@example.com`;
  const attrName1 = 'custom:test1';
  const attrVal1 = 'sample1';
  const attrName2 = 'custom:test2';
  const attrVal2 = 'sample2';
  const attrVal3 = 'sample3';

  await createCognitoUserAndToken();

  await cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      UserAttributes: [
        { Name: attrName1, Value: attrVal1 },
        { Name: attrName2, Value: attrVal2 },
      ],
    }),
  );

  await cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      UserAttributes: [
        { Name: 'email', Value: newEmail },
        { Name: attrName1, Value: attrVal3 },
      ],
    }),
  );

  const user = await cognitoClient.send(
    new AdminGetUserCommand({ UserPoolId: DEFAULT_USER_POOL_ID, Username: testUserName }),
  );

  assert(user.UserAttributes);
  const emailAttr = user.UserAttributes.find((attr) => attr.Name === 'email');
  const targetAttr1 = user.UserAttributes.find((attr) => attr.Name === attrName1);
  const targetAttr2 = user.UserAttributes.find((attr) => attr.Name === attrName2);

  expect(emailAttr?.Value).toBe(newEmail);
  expect(targetAttr1?.Value).toBe(attrVal3);
  expect(targetAttr2?.Value).toBe(attrVal2);
});

test(AdminDeleteUserAttributesCommand.name, async () => {
  const attrName1 = 'custom:test1';
  const attrName2 = 'custom:test2';

  await createCognitoUserAndToken();

  await cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      UserAttributes: [
        { Name: attrName1, Value: 'sample1' },
        { Name: attrName2, Value: 'sample2' },
      ],
    }),
  );

  await cognitoClient.send(
    new AdminDeleteUserAttributesCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      UserAttributeNames: [attrName1],
    }),
  );

  const user = await cognitoClient.send(
    new AdminGetUserCommand({ UserPoolId: DEFAULT_USER_POOL_ID, Username: testUserName }),
  );

  expect(user.UserAttributes?.every((attr) => attr.Name !== attrName1)).toBeTruthy();
  expect(user.UserAttributes?.some((attr) => attr.Name === attrName2)).toBeTruthy();
});

test(AdminUserGlobalSignOutCommand.name, async () => {
  await createCognitoUserAndToken();

  const tokens = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
    }),
  );

  expect(tokens.AuthenticationResult?.RefreshToken).toBeTruthy();

  const refreshTokenBefore = tokens.AuthenticationResult?.RefreshToken;

  await cognitoClient.send(
    new AdminUserGlobalSignOutCommand({ UserPoolId: DEFAULT_USER_POOL_ID, Username: testUserName }),
  );

  const tokensAfter = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
    }),
  );

  expect(tokensAfter.AuthenticationResult?.RefreshToken).not.toBe(refreshTokenBefore);
});

test(`${AdminUserGlobalSignOutCommand.name} - revoked access token is rejected`, async () => {
  await createCognitoUserAndToken();

  const tokens = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
    }),
  );

  assert(tokens.AuthenticationResult?.AccessToken);

  await cognitoClient.send(
    new AdminUserGlobalSignOutCommand({ UserPoolId: DEFAULT_USER_POOL_ID, Username: testUserName }),
  );

  await expect(
    cognitoClient.send(
      new GetUserCommand({ AccessToken: tokens.AuthenticationResult.AccessToken }),
    ),
  ).rejects.toThrow('Access Token has been revoked');
});

test('expired access token is rejected', async () => {
  await createCognitoUserAndToken();

  const tokens = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
    }),
  );

  assert(tokens.AuthenticationResult?.AccessToken);

  await prismaClient.userToken.updateMany({
    where: { token: tokens.AuthenticationResult.AccessToken, kind: 'access' },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  await expect(
    cognitoClient.send(
      new GetUserCommand({ AccessToken: tokens.AuthenticationResult.AccessToken }),
    ),
  ).rejects.toThrow('Access Token has expired');
});

test('Admin API rejects invalid credentials', async () => {
  const invalidClient = new CognitoIdentityProviderClient({
    endpoint: `http://localhost:${PORT}`,
    region: REGION,
    credentials: { accessKeyId: 'INVALID_KEY', secretAccessKey: 'INVALID_SECRET' },
  });

  await expect(
    invalidClient.send(
      new AdminGetUserCommand({ UserPoolId: DEFAULT_USER_POOL_ID, Username: testUserName }),
    ),
  ).rejects.toThrow();
});
