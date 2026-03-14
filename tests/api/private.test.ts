import { EXPIRES_SEC } from 'server/service/constants';
import { expect, test, vi } from 'vitest';
import { createUserClient, lowLevelNoCookieClient, noCookieClient } from './apiClient';
import { createCognitoUserAndToken, testName } from './utils';

test(testName.GET(noCookieClient['privateApi/me']), async () => {
  const failure = await lowLevelNoCookieClient['privateApi/me'].$get();

  await expect(failure.raw?.status).toBe(401);

  const userClient = await createCognitoUserAndToken().then(createUserClient);
  const res = await userClient['privateApi/me'].$get();

  expect(res).toBeTruthy();

  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.advanceTimersByTime(EXPIRES_SEC * 1000);

  const expired = await userClient['privateApi/me'].$get().catch((e) => e.message);

  expect(expired).toBe('Unknown status: 403');

  vi.useRealTimers();
});
