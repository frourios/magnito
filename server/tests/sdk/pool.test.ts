import {
  AdminCreateUserCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  DeleteUserPoolClientCommand,
  DeleteUserPoolCommand,
  ListUserPoolClientsCommand,
  ListUserPoolsCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from 'service/cognito';
import { expect, test } from 'vitest';

test(CreateUserPoolCommand.name, async () => {
  const pool = await cognitoClient.send(new CreateUserPoolCommand({ PoolName: 'testPool' }));
  const client = await cognitoClient.send(
    new CreateUserPoolClientCommand({ ClientName: 'testClient', UserPoolId: pool.UserPool?.Id }),
  );

  expect(pool.UserPool?.Name === 'testPool').toBeTruthy();
  expect(client.UserPoolClient?.ClientName === 'testClient').toBeTruthy();
});

test(DeleteUserPoolCommand.name, async () => {
  const pool = await cognitoClient.send(new CreateUserPoolCommand({ PoolName: 'testPool' }));

  await cognitoClient.send(
    new CreateUserPoolClientCommand({ ClientName: 'testClient', UserPoolId: pool.UserPool?.Id }),
  );
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: pool.UserPool?.Id,
      Username: 'test',
      UserAttributes: [{ Name: 'email', Value: 'test@example.com' }],
    }),
  );

  const res1 = await cognitoClient.send(new ListUserPoolsCommand({ MaxResults: 100 }));

  await cognitoClient.send(new DeleteUserPoolCommand({ UserPoolId: pool.UserPool?.Id }));

  const res2 = await cognitoClient.send(new ListUserPoolsCommand({ MaxResults: 100 }));

  expect(res1.UserPools).toHaveLength(2);
  expect(res2.UserPools).toHaveLength(1);
});

// oxlint-disable-next-line complexity
test(DeleteUserPoolClientCommand.name, async () => {
  const pool = await cognitoClient.send(new CreateUserPoolCommand({ PoolName: 'testPool' }));
  const client = await cognitoClient.send(
    new CreateUserPoolClientCommand({ ClientName: 'testClient', UserPoolId: pool.UserPool?.Id }),
  );

  const res1 = await cognitoClient.send(
    new ListUserPoolClientsCommand({ UserPoolId: pool.UserPool?.Id, MaxResults: 100 }),
  );

  await cognitoClient.send(
    new DeleteUserPoolClientCommand({
      ClientId: client.UserPoolClient?.ClientId,
      UserPoolId: pool.UserPool?.Id,
    }),
  );

  const res2 = await cognitoClient.send(
    new ListUserPoolClientsCommand({ UserPoolId: pool.UserPool?.Id, MaxResults: 100 }),
  );

  expect(res1.UserPoolClients).toHaveLength(1);
  expect(res2.UserPoolClients).toHaveLength(0);
});
