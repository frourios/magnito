import assert from 'assert';
import {
  AdminCreateUserCommand,
  AdminDeleteUserAttributesCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  UserStatusType,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from 'service/cognito';
import { DEFAULT_USER_POOL_CLIENT_ID, DEFAULT_USER_POOL_ID } from 'service/envValues';
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

  await expect(userClient.private.me.get()).rejects.toThrow();
});

test(`${AdminDeleteUserCommand.name} - social`, async () => {
  const userClient = await createSocialUserAndToken().then(createUserClient);

  await cognitoClient.send(
    new AdminDeleteUserCommand({ UserPoolId: DEFAULT_USER_POOL_ID, Username: testUserName }),
  );

  await expect(userClient.private.me.get()).rejects.toThrow();
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
