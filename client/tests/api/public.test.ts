import { createSigner } from 'fast-jwt';
import { COOKIE_NAME, EXPIRES_SEC } from 'server/service/constants';
import { DEFAULT_USER_POOL_CLIENT_ID, DEFAULT_USER_POOL_ID } from 'server/service/serverEnvs';
import { expect, test } from 'vitest';
import { lowLevelNoCookieClient, noCookieClient } from './apiClient';
import { testName } from './utils';

test(testName.GET(noCookieClient), async () => {
  const res = await lowLevelNoCookieClient.$get();

  expect(res.data?.headers['content-type']).toEqual('text/html');
});

test(testName.GET(noCookieClient['publicApi/health']), async () => {
  const res = await noCookieClient['publicApi/health'].$get();

  expect(res).toEqual('ok');
});

test(testName.GET(noCookieClient['publicApi/defaults']), async () => {
  const res = await noCookieClient['publicApi/defaults'].$get();

  expect(res.userPoolId).toBe(DEFAULT_USER_POOL_ID);
  expect(res.userPoolClientId).toBe(DEFAULT_USER_POOL_CLIENT_ID);
});

test(testName.POST(noCookieClient['publicApi/session']), async () => {
  const jwt = createSigner({ key: 'dummy' })({ exp: Math.floor(Date.now() / 1000) + EXPIRES_SEC });
  const res = await lowLevelNoCookieClient['publicApi/session'].$post({ body: { jwt } });

  expect(res.raw?.headers.get('set-cookie')?.startsWith(`${COOKIE_NAME}=${jwt};`)).toBeTruthy();
  expect(res.ok).toBeTruthy();
});

test(testName.DELETE(noCookieClient['publicApi/session']), async () => {
  const res = await lowLevelNoCookieClient['publicApi/session'].$delete();

  expect(res.raw?.headers.get('set-cookie')?.startsWith(`${COOKIE_NAME}=;`)).toBeTruthy();
  expect(res.ok).toBeTruthy();
});
