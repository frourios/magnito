import type { NextResponse } from 'vinext/shims/server';

export const COOKIE_NAME = 'session';

export const EXPIRES_SEC = 3600;

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

export const COOKIE_OPTIONS: Partial<NonNullable<ReturnType<NextResponse['cookies']['get']>>> = {
  httpOnly: true,
  secure: true,
  path: '/',
  sameSite: 'strict',
};
