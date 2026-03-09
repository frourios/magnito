import assert from 'assert';
import { createHash } from 'crypto';
import {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { InbucketAPIClient } from 'inbucket-js-client';
import { cognitoClient } from 'service/cognito';
import { DEFAULT_USER_POOL_CLIENT_ID, DEFAULT_USER_POOL_ID } from 'service/envValues';
import { ulid } from 'ulid';
import { noCookieClient, testPassword, testUserName } from './apiClient';

export const GET = (api: { $path: () => string }): string => `GET: ${api.$path()}`;
export const POST = (api: { $path: () => string }): string => `POST: ${api.$path()}`;
export const PATCH = (api: { $path: () => string }): string => `PATCH: ${api.$path()}`;
export const DELETE = (api: { $path: () => string }): string => `DELETE: ${api.$path()}`;

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

  assert(res.AuthenticationResult?.IdToken);

  return { AccessToken: res.AuthenticationResult.IdToken };
};

export const createSocialUserAndToken = async (): Promise<{ AccessToken: string }> => {
  const codeVerifier = ulid();

  const user = await noCookieClient.public.socialUsers.$post({
    body: {
      provider: 'Google',
      name: testUserName,
      email: `${ulid()}@example.com`,
      codeChallenge: createHash('sha256').update(codeVerifier).digest('base64url'),
      userPoolClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  const res = await noCookieClient.oauth2.token.$post({
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
