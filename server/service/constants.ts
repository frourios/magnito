import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const COOKIE_NAME = 'session';

export const EXPIRES_SEC = 3600;

export const COOKIE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: true,
  path: '/',
  sameSite: 'strict',
};
