import assert from 'assert';
import { InbucketAPIClient } from 'inbucket-js-client';
import { DEFAULT_USER_POOL_CLIENT_ID } from 'server/service/serverEnvs';
import { ulid } from 'ulid';
import { expect, test } from 'vitest';
import { noCookieClient, lowLevelNoCookieClient, testUserName } from './apiClient';

test('ForgotPassword', async () => {
  const email = `${ulid()}@example.com`;

  await lowLevelNoCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.SignUp' },
    body: {
      Username: testUserName,
      Password: 'Test-client-password2',
      UserAttributes: [{ Name: 'email', Value: email }],
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  await lowLevelNoCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.ResendConfirmationCode' },
    body: { ClientId: DEFAULT_USER_POOL_CLIENT_ID, Username: testUserName },
  });

  assert(process.env.INBUCKET_URL);

  const inbucketClient = new InbucketAPIClient(process.env.INBUCKET_URL);
  const inbox = await inbucketClient.mailbox(email);
  const message = await inbucketClient.message(email, inbox[0].id);
  const res1 = await lowLevelNoCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.ConfirmSignUp' },
    body: {
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      ConfirmationCode: message.body.text.trim().split(' ').at(-1) ?? '',
      Username: testUserName,
    },
  });

  expect(res1.data?.status).toBe(200);

  await inbucketClient.deleteMessage(email, inbox[0].id);
  await inbucketClient.deleteMessage(email, inbox[1].id);

  const res2 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.ForgotPassword' },
    body: {
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      Username: testUserName,
    },
  });
  assert('CodeDeliveryDetails' in res2);

  const inbox2 = await inbucketClient.mailbox(email);
  const message2 = await inbucketClient.message(email, inbox2[0].id);

  const res3 = await lowLevelNoCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.ConfirmForgotPassword' },
    body: {
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      ConfirmationCode: message2.body.text.trim().split(' ').at(-1) ?? '',
      Password: 'Test-client-password2',
      Username: testUserName,
    },
  });

  await inbucketClient.deleteMessage(email, inbox2[0].id);

  expect(res3.data?.status).toBe(200);
});
