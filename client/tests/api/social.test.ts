import { createHash } from 'crypto';
import { DEFAULT_USER_POOL_CLIENT_ID } from 'server/service/serverEnvs';
import { ulid } from 'ulid';
import { expect, test } from 'vitest';
import { lowLevelNoCookieClient, noCookieClient } from './apiClient';
import { testName } from './utils';

test(testName.POST(noCookieClient['publicApi/socialUsers']), async () => {
  const name1 = 'user1';
  const email1 = `${ulid()}@example.com`;

  await noCookieClient['publicApi/socialUsers'].$post({
    body: {
      provider: 'Google',
      name: name1,
      email: email1,
      codeChallenge: createHash('sha256').update(ulid()).digest('base64url'),
      userPoolClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  const name2 = 'user2';
  const email2 = `${ulid()}@example.com`;
  const photoUrl = `https://example.com/${ulid()}.png`;

  await noCookieClient['publicApi/socialUsers'].$post({
    body: {
      provider: 'Amazon',
      name: name2,
      email: email2,
      codeChallenge: createHash('sha256').update(ulid()).digest('base64url'),
      photoUrl,
      userPoolClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  const res = await noCookieClient['publicApi/socialUsers'].$get({
    query: { userPoolClientId: DEFAULT_USER_POOL_CLIENT_ID },
  });

  expect(res).toHaveLength(2);
});

test(testName.PATCH(noCookieClient['publicApi/socialUsers']), async () => {
  const codeChallenge1 = createHash('sha256').update(ulid()).digest('base64url');
  const codeChallenge2 = createHash('sha256').update(ulid()).digest('base64url');
  const user = await noCookieClient['publicApi/socialUsers'].$post({
    body: {
      provider: 'Google',
      name: 'user1',
      email: `${ulid()}@example.com`,
      codeChallenge: codeChallenge1,
      userPoolClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  const updated = await noCookieClient['publicApi/socialUsers'].$patch({
    body: { id: user.id, codeChallenge: codeChallenge2 },
  });

  expect(updated.codeChallenge).toBe(codeChallenge2);
});

test(testName.POST(noCookieClient['oauth2/token']), async () => {
  const codeVerifier = ulid();
  const user = await noCookieClient['publicApi/socialUsers'].$post({
    body: {
      provider: 'Google',
      name: 'user1',
      email: `${ulid()}@example.com`,
      codeChallenge: createHash('sha256').update(codeVerifier).digest('base64url'),
      userPoolClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  const res = await lowLevelNoCookieClient['oauth2/token'].$post({
    body: {
      grant_type: 'authorization_code',
      code: user.authorizationCode,
      client_id: DEFAULT_USER_POOL_CLIENT_ID,
      redirect_uri: 'https://example.com',
      code_verifier: codeVerifier,
    },
  });

  expect(res.ok).toBeTruthy();
});

const logoutUri = noCookieClient['publicApi/defaults'].$url.get();
const logoutQuery = { client_id: DEFAULT_USER_POOL_CLIENT_ID, logout_uri: logoutUri };

test(`GET: ${noCookieClient.logout.$url.get({ query: logoutQuery })}`, async () => {
  const res = await lowLevelNoCookieClient.logout.$get({ query: logoutQuery });

  expect(res.data?.redirected).toBeTruthy();
  expect(res.ok).toBeTruthy();
});
