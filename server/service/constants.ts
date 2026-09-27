import type { NextResponse } from 'vinext/shims/server';

export const COOKIE_NAME = 'session';

export const SOCIAL_FLOW_COOKIE_NAME = 'social_oauth_flow';

export const MANAGED_LOGIN_FLOW_COOKIE_NAME = 'csrf-state';

export const MANAGED_LOGIN_XSRF_COOKIE_NAME = 'XSRF-TOKEN';

export const EXPIRES_SEC = 3600;

export const SHORT_LIVED_SEC = 300;

export const REFRESH_TOKEN_EXPIRES_SEC = 30 * 24 * 3600; // 30 days

export const ADMIN_CHALLENGE_TOKEN_KINDS = ['admin_password_mfa', 'admin_new_password'] as const;

export const TOKEN_KINDS = [
  'id',
  'access',
  'refresh',
  'password_mfa',
  ...ADMIN_CHALLENGE_TOKEN_KINDS,
] as const;

export type AdminChallengeTokenKind = (typeof ADMIN_CHALLENGE_TOKEN_KINDS)[number];

export type TokenKind = (typeof TOKEN_KINDS)[number];

type CookieOptions = Partial<NonNullable<ReturnType<NextResponse['cookies']['get']>>>;

export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  path: '/',
  sameSite: 'strict',
};

export const SOCIAL_FLOW_COOKIE_OPTIONS: CookieOptions = {
  ...COOKIE_OPTIONS,
  sameSite: 'lax',
  path: '/oauth2/server',
  maxAge: 300,
};

export const MANAGED_LOGIN_FLOW_COOKIE_OPTIONS: CookieOptions = {
  ...COOKIE_OPTIONS,
  sameSite: 'lax',
  maxAge: SHORT_LIVED_SEC,
};

export const MANAGED_LOGIN_XSRF_COOKIE_OPTIONS: CookieOptions = {
  ...MANAGED_LOGIN_FLOW_COOKIE_OPTIONS,
  httpOnly: false,
};
