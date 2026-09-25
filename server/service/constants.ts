import type { NextResponse } from 'vinext/shims/server';

export const COOKIE_NAME = 'session';

export const EXPIRES_SEC = 3600;

export const REFRESH_TOKEN_EXPIRES_SEC = 30 * 24 * 3600; // 30 days

export const TOKEN_KINDS = ['id', 'access', 'refresh'] as const;

export type TokenKind = (typeof TOKEN_KINDS)[number];

export const COOKIE_OPTIONS: Partial<NonNullable<ReturnType<NextResponse['cookies']['get']>>> = {
  httpOnly: true,
  secure: true,
  path: '/',
  sameSite: 'strict',
};
