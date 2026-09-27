import { createHash } from 'crypto';
import { parseCookie } from 'cookie';
import { ulid } from 'ulid';
import { expect, test } from 'vitest';
import { COOKIE_NAME, SOCIAL_FLOW_COOKIE_NAME } from '../../server/service/constants';
import { DEFAULT_USER_POOL_CLIENT_ID } from '../../server/service/serverEnvs';
import { GET as callback } from '../../src/app/oauth2/server/callback/route';
import { GET as start } from '../../src/app/oauth2/server/start/route';
import { createUserClient, lowLevelNoCookieClient, noCookieClient } from './apiClient';
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
  expect(updated.authorizationCode).not.toBe(user.authorizationCode);
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

// oxlint-disable-next-line complexity
test('server exchanges a mock social authorization code into an HttpOnly session', async () => {
  const startRes = await start(
    new Request('https://localhost:5051/oauth2/server/start?provider=Google'),
  );
  expect(startRes.status).toBe(302);
  const authorizeUrl = new URL(startRes.headers.get('location') ?? '');
  const flowCookie = startRes.cookies.get(SOCIAL_FLOW_COOKIE_NAME)?.value;
  expect(flowCookie).toBeTruthy();
  expect(startRes.headers.getSetCookie().join(';')).toContain('HttpOnly');
  expect(authorizeUrl.searchParams.get('code_challenge_method')).toBe('S256');
  expect(authorizeUrl.searchParams.get('redirect_uri')).toBe(
    'https://localhost:5051/oauth2/server/callback',
  );

  const user = await noCookieClient['publicApi/socialUsers'].$post({
    body: {
      provider: 'Google',
      name: 'server-user',
      email: `${ulid()}@example.com`,
      codeChallenge: authorizeUrl.searchParams.get('code_challenge') ?? '',
      userPoolClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });
  const callbackUrl = new URL(authorizeUrl.searchParams.get('redirect_uri') ?? '');
  callbackUrl.searchParams.set('code', user.authorizationCode);
  callbackUrl.searchParams.set('state', authorizeUrl.searchParams.get('state') ?? '');
  const callbackReq = () =>
    new Request(callbackUrl, { headers: { cookie: `${SOCIAL_FLOW_COOKIE_NAME}=${flowCookie}` } });

  const callbackRes = await callback(callbackReq());
  expect(callbackRes.status).toBe(302);
  expect(callbackRes.headers.get('location')).toBe('https://localhost:5051/console');
  const sessionCookie = callbackRes.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));
  expect(sessionCookie).toContain('HttpOnly');
  const token = parseCookie(sessionCookie ?? '')[COOKIE_NAME];
  expect(token).toBeTruthy();
  const privateClient = await createUserClient({ AccessToken: token ?? '' });
  expect((await privateClient['privateApi/me'].$get()).id).toBe(user.id);

  expect((await callback(callbackReq())).status).toBe(400);
});

test('server social callback rejects missing, mismatched, and invalid flows', async () => {
  expect(
    (await start(new Request('https://localhost:5051/oauth2/server/start?provider=Invalid')))
      .status,
  ).toBe(400);

  const url = new URL('https://localhost:5051/oauth2/server/callback');
  url.searchParams.set('code', ulid());
  url.searchParams.set('state', ulid());
  expect((await callback(new Request(url))).status).toBe(400);

  const startRes = await start(
    new Request('https://localhost:5051/oauth2/server/start?provider=Apple'),
  );
  const flowCookie = startRes.cookies.get(SOCIAL_FLOW_COOKIE_NAME)?.value;
  const withCookie = () =>
    new Request(url, { headers: { cookie: `${SOCIAL_FLOW_COOKIE_NAME}=${flowCookie}` } });
  expect((await callback(withCookie())).status).toBe(400);

  url.searchParams.set(
    'state',
    new URL(startRes.headers.get('location') ?? '').searchParams.get('state') ?? '',
  );
  expect((await callback(withCookie())).status).toBe(400);
});

const logoutUri = noCookieClient['publicApi/defaults'].$url.get();
const logoutQuery = { client_id: DEFAULT_USER_POOL_CLIENT_ID, logout_uri: logoutUri };

test(`GET: ${noCookieClient.logout.$url.get({ query: logoutQuery })}`, async () => {
  const res = await lowLevelNoCookieClient.logout.$get({ query: logoutQuery });

  expect(res.data?.redirected).toBeTruthy();
  expect(res.ok).toBeTruthy();
});
