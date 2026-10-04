import assert from 'node:assert';
import {
  AddUserPoolClientSecretCommand,
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  CreateUserPoolClientCommand,
  DeleteUserPoolClientSecretCommand,
  DescribeUserPoolClientCommand,
  ListUserPoolClientSecretsCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ulid } from 'ulid';
import { expect, test } from 'vitest';
import { clientSecretHash } from '../../server/service/clientSecret';
import { cognitoClient } from '../../server/service/cognito';
import { DEFAULT_USER_POOL_ID } from '../../server/service/serverEnvs';
import { testPassword, testUserName } from '../api/apiClient';

const createClient = async (options: { GenerateSecret?: boolean; ClientSecret?: string } = {}) => {
  const result = await cognitoClient.send(
    new CreateUserPoolClientCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientName: `rotation-${ulid()}`,
      ...options,
    }),
  );
  const clientId = result.UserPoolClient?.ClientId;
  assert(clientId);
  return { clientId, secret: result.UserPoolClient?.ClientSecret };
};

// oxlint-disable-next-line complexity
test('generated secrets rotate with two active values and never appear in list', async () => {
  const { clientId, secret: oldSecret } = await createClient({ GenerateSecret: true });
  assert(oldSecret);
  expect(oldSecret).toMatch(/^[\w+]{24,64}$/);
  const list = () =>
    cognitoClient.send(
      new ListUserPoolClientSecretsCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: clientId,
      }),
    );
  const initial = await list();
  expect(initial.ClientSecrets).toHaveLength(1);
  expect(initial.ClientSecrets?.[0]?.ClientSecretId).toMatch(new RegExp(`^${clientId}--[0-9]+$`));
  expect(initial.ClientSecrets?.[0]?.ClientSecretValue).toBeUndefined();
  const added = await cognitoClient.send(
    new AddUserPoolClientSecretCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: clientId,
    }),
  );
  const newSecret = added.ClientSecretDescriptor?.ClientSecretValue;
  assert(newSecret);
  expect(newSecret).toMatch(/^[\w+]{24,64}$/);
  expect(newSecret).not.toBe(oldSecret);
  expect((await list()).ClientSecrets).toHaveLength(2);
  expect((await list()).ClientSecrets?.every((item) => item.ClientSecretValue === undefined)).toBe(
    true,
  );
  await expect(
    cognitoClient.send(
      new AddUserPoolClientSecretCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: clientId,
      }),
    ),
  ).rejects.toMatchObject({ name: 'LimitExceededException' });

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
  const authenticate = (value: string) =>
    cognitoClient.send(
      new AdminInitiateAuthCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: clientId,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: testUserName,
          PASSWORD: testPassword,
          SECRET_HASH: clientSecretHash(testUserName, clientId, value),
        },
      }),
    );
  expect((await authenticate(oldSecret)).AuthenticationResult?.IdToken).toBeTruthy();
  expect((await authenticate(newSecret)).AuthenticationResult?.IdToken).toBeTruthy();

  const oldId = initial.ClientSecrets?.[0]?.ClientSecretId;
  assert(oldId);
  await cognitoClient.send(
    new DeleteUserPoolClientSecretCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: clientId,
      ClientSecretId: oldId,
    }),
  );
  await expect(authenticate(oldSecret)).rejects.toThrow('Unable to verify client secret hash.');
  expect((await authenticate(newSecret)).AuthenticationResult?.IdToken).toBeTruthy();
  expect(
    (
      await cognitoClient.send(
        new DescribeUserPoolClientCommand({
          UserPoolId: DEFAULT_USER_POOL_ID,
          ClientId: clientId,
        }),
      )
    ).UserPoolClient?.ClientSecret,
  ).toBe(newSecret);
  await expect(
    cognitoClient.send(
      new DeleteUserPoolClientSecretCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: clientId,
        ClientSecretId: added.ClientSecretDescriptor?.ClientSecretId,
      }),
    ),
  ).rejects.toMatchObject({ name: 'InvalidParameterException' });
  await expect(
    cognitoClient.send(
      new DeleteUserPoolClientSecretCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: clientId,
        ClientSecretId: 'missing',
      }),
    ),
  ).rejects.toMatchObject({ name: 'ResourceNotFoundException' });
});

test('custom secrets can be supplied at creation and rotation', async () => {
  const first = 'custom_secret_value_12345678';
  const second = 'next_custom_secret_value_1234';
  const { clientId, secret } = await createClient({ ClientSecret: first });
  expect(secret).toBe(first);
  const added = await cognitoClient.send(
    new AddUserPoolClientSecretCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: clientId,
      ClientSecret: second,
    }),
  );
  expect(added.ClientSecretDescriptor?.ClientSecretId).toBeTruthy();
  expect(added.ClientSecretDescriptor?.ClientSecretValue).toBeUndefined();
  expect(
    (
      await cognitoClient.send(
        new ListUserPoolClientSecretsCommand({
          UserPoolId: DEFAULT_USER_POOL_ID,
          ClientId: clientId,
        }),
      )
    ).ClientSecrets,
  ).toHaveLength(2);
  await expect(createClient({ GenerateSecret: true, ClientSecret: first })).rejects.toMatchObject({
    name: 'InvalidParameterException',
  });
  await expect(createClient({ ClientSecret: 'short' })).rejects.toMatchObject({
    name: 'InvalidParameterException',
  });
  await expect(
    cognitoClient.send(
      new AddUserPoolClientSecretCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: clientId,
        ClientSecret: 'invalid-secret-value-12345',
      }),
    ),
  ).rejects.toMatchObject({ name: 'InvalidParameterException' });
});

test('public clients cannot add secrets', async () => {
  const { clientId } = await createClient();
  expect(
    (
      await cognitoClient.send(
        new ListUserPoolClientSecretsCommand({
          UserPoolId: DEFAULT_USER_POOL_ID,
          ClientId: clientId,
        }),
      )
    ).ClientSecrets,
  ).toEqual([]);
  await expect(
    cognitoClient.send(
      new AddUserPoolClientSecretCommand({
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: clientId,
      }),
    ),
  ).rejects.toMatchObject({ name: 'InvalidParameterException' });
});
