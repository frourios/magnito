import assert from 'assert';
import { createHash } from 'crypto';
import {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { InbucketAPIClient } from 'inbucket-js-client';
import { cognitoClient } from 'server/service/cognito';
import { DEFAULT_USER_POOL_CLIENT_ID, DEFAULT_USER_POOL_ID } from 'server/service/serverEnvs';
import { ulid } from 'ulid';
import { noCookieClient, testPassword, testUserName } from './apiClient';

export const testName = {
  GET: (fc: { $get: unknown; $url: { get(): string } }) => `GET: ${fc.$url.get()}`,
  POST: (fc: { $post: unknown; $url: { post(): string } }) => `POST: ${fc.$url.post()}`,
  PATCH: (fc: { $patch: unknown; $url: { patch(): string } }) => `PATCH: ${fc.$url.patch()}`,
  DELETE: (fc: { $delete: unknown; $url: { delete(): string } }) => `DELETE: ${fc.$url.delete()}`,
};

assert(process.env.INBUCKET_URL);

export const inbucketClient = new InbucketAPIClient(process.env.INBUCKET_URL);

export const fetchMailBodyAndTrash = async (email: string): Promise<string> => {
  const mailbox = await inbucketClient.mailbox(email);
  const message = await inbucketClient.message(email, mailbox[0].id);
  await inbucketClient.deleteMessage(email, mailbox[0].id);

  return message.body.text.trim();
};

export const createCognitoUserAndToken = async (): Promise<{ AccessToken: string }> => {
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      UserAttributes: [{ Name: 'email', Value: `${ulid()}@example.com` }],
    }),
  );

  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: DEFAULT_USER_POOL_ID,
      Username: testUserName,
      Permanent: true,
      Password: testPassword,
    }),
  );

  const res = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      UserPoolId: DEFAULT_USER_POOL_ID,
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
      AuthParameters: { USERNAME: testUserName, PASSWORD: testPassword },
    }),
  );

  assert(res.AuthenticationResult?.AccessToken);

  return { AccessToken: res.AuthenticationResult.AccessToken };
};

export const createSocialUserAndToken = async (): Promise<{ AccessToken: string }> => {
  const codeVerifier = ulid();

  const user = await noCookieClient['publicApi/socialUsers'].$post({
    body: {
      provider: 'Google',
      name: testUserName,
      email: `${ulid()}@example.com`,
      codeChallenge: createHash('sha256').update(codeVerifier).digest('base64url'),
      userPoolClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  const res = await noCookieClient['oauth2/token'].$post({
    body: {
      grant_type: 'authorization_code',
      code: user.authorizationCode,
      client_id: DEFAULT_USER_POOL_CLIENT_ID,
      redirect_uri: 'https://example.com',
      code_verifier: codeVerifier,
    },
  });

  return { AccessToken: res.id_token };
};
