import assert from 'assert';
import {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ulid } from 'ulid';
import { expect, test } from 'vitest';
import { cognitoClient } from '../../server/service/cognito';
import { DEFAULT_USER_POOL_ID } from '../../server/service/serverEnvs';
import { testPassword, testUserName } from '../api/apiClient';
import { createCognitoUserAndToken } from '../api/utils';

test('AdminInitiateAuth finds the username in the requested pool', async () => {
  await createCognitoUserAndToken();

  const pool = await cognitoClient.send(new CreateUserPoolCommand({ PoolName: `pool-${ulid()}` }));
  assert(pool.UserPool?.Id);
  const poolId = pool.UserPool.Id;
  const client = await cognitoClient.send(
    new CreateUserPoolClientCommand({ UserPoolId: poolId, ClientName: 'other-client' }),
  );
  assert(client.UserPoolClient?.ClientId);

  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: poolId,
      Username: testUserName,
      TemporaryPassword: 'Temporary-password1!',
      MessageAction: 'SUPPRESS',
      UserAttributes: [{ Name: 'email', Value: `${ulid()}@example.com` }],
    }),
  );
  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: poolId,
      Username: testUserName,
      Password: testPassword,
      Permanent: true,
    }),
  );

  const result = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      UserPoolId: poolId,
      ClientId: client.UserPoolClient.ClientId,
      AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
    }),
  );

  expect(result.AuthenticationResult?.AccessToken).toBeTruthy();
  expect(result.AuthenticationResult?.IdToken).toBeTruthy();
  expect(poolId).not.toBe(DEFAULT_USER_POOL_ID);
});
