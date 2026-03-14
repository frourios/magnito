import { ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from 'server/service/cognito';
import { DEFAULT_USER_POOL_ID } from 'server/service/serverEnvs';
import { testUserName } from 'tests/api/apiClient';
import { createCognitoUserAndToken } from 'tests/api/utils';
import { expect, test } from 'vitest';

test(ListUsersCommand.name, async () => {
  await createCognitoUserAndToken();

  const users = await cognitoClient.send(
    new ListUsersCommand({ UserPoolId: DEFAULT_USER_POOL_ID }),
  );

  expect(users.Users).toHaveLength(1);
  expect(users.Users?.[0].Username).toBe(testUserName);
});
