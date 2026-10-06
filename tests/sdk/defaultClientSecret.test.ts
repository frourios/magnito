import {
  AddUserPoolClientSecretCommand,
  DescribeUserPoolClientCommand,
  ListUserPoolClientSecretsCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { expect, test } from 'vitest';
import { userPoolUseCase } from '../../server/domain/userPool/useCase/userPoolUseCase';
import { cognitoClient } from '../../server/service/cognito';
import { prismaClient } from '../../server/service/prismaClient';
import { DEFAULT_USER_POOL_CLIENT_ID, DEFAULT_USER_POOL_ID } from '../../server/service/serverEnvs';

const firstSecret = 'first_default_secret_1234567890';
const nextSecret = 'second_default_secret_123456789';
const request = { UserPoolId: DEFAULT_USER_POOL_ID, ClientId: DEFAULT_USER_POOL_CLIENT_ID };
const secrets = () =>
  prismaClient.userPoolClientSecret.findMany({
    where: { clientId: DEFAULT_USER_POOL_CLIENT_ID },
  });

// oxlint-disable-next-line complexity
test('default client secret follows the configured value across restarts', async () => {
  expect(await secrets()).toEqual([]);
  await userPoolUseCase.initDefaults(firstSecret);
  const first = await secrets();
  expect(first).toHaveLength(1);
  expect(first[0]?.value).toBe(firstSecret);
  expect(
    (await cognitoClient.send(new DescribeUserPoolClientCommand(request))).UserPoolClient
      ?.ClientSecret,
  ).toBe(firstSecret);

  await userPoolUseCase.initDefaults(firstSecret);
  expect(await secrets()).toEqual(first);

  await cognitoClient.send(new AddUserPoolClientSecretCommand(request));
  expect(await secrets()).toHaveLength(2);
  await userPoolUseCase.initDefaults(firstSecret);
  expect(await secrets()).toHaveLength(2);

  await userPoolUseCase.initDefaults(nextSecret);
  const next = await secrets();
  expect(next).toHaveLength(1);
  expect(next[0]?.value).toBe(nextSecret);
  expect(next[0]?.id).not.toBe(first[0]?.id);

  await userPoolUseCase.initDefaults();
  expect(await secrets()).toEqual([]);
  expect(
    (await cognitoClient.send(new ListUserPoolClientSecretsCommand(request))).ClientSecrets,
  ).toEqual([]);
  await expect(
    cognitoClient.send(new AddUserPoolClientSecretCommand(request)),
  ).rejects.toMatchObject({
    name: 'InvalidParameterException',
  });
});

test('invalid configured secret does not change an existing default client', async () => {
  await userPoolUseCase.initDefaults(firstSecret);
  await expect(userPoolUseCase.initDefaults('short')).rejects.toThrow(
    'Invalid client secret value.',
  );
  expect((await secrets())[0]?.value).toBe(firstSecret);
});
