import {
  AdminInitiateAuthCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from 'server/service/cognito';
import { DEFAULT_USER_POOL_CLIENT_ID, DEFAULT_USER_POOL_ID } from 'server/service/serverEnvs';
import { ulid } from 'ulid';
import { expect, test } from 'vitest';
import { lowLevelNoCookieClient, noCookieClient } from './apiClient';
import { fetchMailBodyAndTrash } from './utils';

test('signUp', async () => {
  const Username = 'user';
  const Password = 'Test-client-password2';
  const email = `${ulid()}@example.com`;

  await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.SignUp' },
    body: {
      Username,
      Password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'custom:test', Value: 'sample' },
      ],
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.ResendConfirmationCode' },
    body: { ClientId: DEFAULT_USER_POOL_CLIENT_ID, Username },
  });

  const token = await cognitoClient
    .send(
      new AdminInitiateAuthCommand({
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        UserPoolId: DEFAULT_USER_POOL_ID,
        ClientId: DEFAULT_USER_POOL_CLIENT_ID,
        AuthParameters: { USERNAME: Username, PASSWORD: Password },
      }),
    )
    .then((res) => res.AuthenticationResult?.IdToken);

  const user = await cognitoClient.send(new GetUserCommand({ AccessToken: token ?? '' }));

  expect(
    user.UserAttributes?.some((attr) => attr.Name === 'email_verified' && attr.Value === 'false'),
  ).toBeTruthy();

  const message = await fetchMailBodyAndTrash(email);
  const res = await lowLevelNoCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.ConfirmSignUp' },
    body: {
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      ConfirmationCode: message.split(' ').at(-1) ?? '',
      Username,
    },
  });

  expect(res.ok).toBeTruthy();
});
