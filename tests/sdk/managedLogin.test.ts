import assert from 'assert';
import { createHash } from 'crypto';
import { parseSetCookie, stringifyCookie } from 'cookie';
import { beforeEach, expect, test, vi } from 'vitest';
import { managedLoginUseCase } from '../../server/domain/user/useCase/managedLoginUseCase';
import { signUpUseCase } from '../../server/domain/user/useCase/signUpUseCase';
import {
  loadManagedLoginConfig,
  validateManagedLoginRequest,
} from '../../server/domain/userPool/service/managedLoginConfig';
import {
  MANAGED_LOGIN_FLOW_COOKIE_NAME,
  MANAGED_LOGIN_XSRF_COOKIE_NAME,
} from '../../server/service/constants';
import {
  createManagedLoginFlow,
  signManagedLoginFlow,
} from '../../server/service/managedLoginCsrf';
import { prismaClient } from '../../server/service/prismaClient';
import { DEFAULT_USER_POOL_CLIENT_ID } from '../../server/service/serverEnvs';
import { GET as managedGet, POST as managedPost } from '../../src/app/oauth2/managed/route';
import { brandedId } from '../../src/schemas/brandedId';

const origin = 'http://localhost:5050';
const redirectUri = 'https://example.test/callback';
const verifier = 'test-verifier-with-enough-entropy-for-pkce';
const challenge = createHash('sha256').update(verifier).digest('base64url');
const browserCookies: Record<string, string> = {};
let csrfToken = '';

beforeEach(() => {
  for (const name of Object.keys(browserCookies)) delete browserCookies[name];
  csrfToken = '';
});

const rememberCookies = (response: Response): void => {
  for (const header of response.headers.getSetCookie()) {
    const cookie = parseSetCookie(header);
    if (cookie.maxAge === 0) delete browserCookies[cookie.name];
    else if (cookie.value) browserCookies[cookie.name] = cookie.value;
  }
};

const GET = async (request: Request): Promise<Response> => {
  const response = await managedGet(request);
  rememberCookies(response);
  if (response.ok) {
    const body = (await response.clone().json()) as { csrfToken?: string };
    if (body.csrfToken) csrfToken = body.csrfToken;
  }
  return response;
};

const POST = async (request: Request): Promise<Response> => {
  const response = await managedPost(request);
  rememberCookies(response);
  return response;
};

const enableManagedDomain = async (userPoolId: string) => {
  await prismaClient.userPoolDomain.create({
    data: {
      domain: 'managed',
      userPoolId,
      managedLoginVersion: 2,
      createdAt: new Date(),
    },
  });
};

const request = (action: string, values: Record<string, string>) =>
  new Request(`${origin}/oauth2/managed`, {
    method: 'POST',
    headers: {
      origin,
      'Content-Type': 'application/json',
      Cookie: stringifyCookie(browserCookies),
      'X-XSRF-TOKEN': csrfToken,
    },
    body: JSON.stringify({
      client_id: DEFAULT_USER_POOL_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'openid',
      action,
      username: 'managed-user',
      ...values,
    }),
  });

const withHeaders = (source: Request, changed: Record<string, string | null>): Request => {
  const headers = new Headers(source.headers);
  for (const [name, value] of Object.entries(changed)) {
    if (value === null) headers.delete(name);
    else headers.set(name, value);
  }
  return new Request(source, { headers });
};

// oxlint-disable-next-line complexity
test('Managed Login renders configured branding and exchanges a password authorization code once', async () => {
  const client = await prismaClient.userPoolClient.update({
    where: { id: DEFAULT_USER_POOL_CLIENT_ID },
    data: {
      allowedOAuthFlowsUserPoolClient: true,
      allowedOAuthFlows: ['code'],
      allowedOAuthScopes: ['openid'],
      callbackUrls: [redirectUri],
    },
  });
  await enableManagedDomain(client.userPoolId);
  await prismaClient.managedLoginBranding.create({
    data: {
      id: 'test-branding',
      userPoolId: client.userPoolId,
      clientId: client.id,
      settings: { components: { form: { borderRadius: 16 } } },
      createdAt: new Date(),
      updatedAt: new Date(),
      assets: {
        create: [
          {
            id: 'test-logo',
            category: 'FORM_LOGO',
            colorMode: 'LIGHT',
            extension: 'PNG',
            bytes: Buffer.from([1, 2, 3]),
            position: 0,
          },
        ],
      },
    },
  });

  const config = await loadManagedLoginConfig(client.id);
  expect(config?.settings.components.form.borderRadius).toBe(16);
  expect(config?.settings.categories.global.colorSchemeMode).toBe('LIGHT');
  expect(config?.assets).toEqual([{ category: 'FORM_LOGO', url: 'data:image/png;base64,AQID' }]);

  const query = new URLSearchParams({
    client_id: brandedId.userPoolClient.maybe.parse(client.id),
    redirect_uri: redirectUri,
    scope: 'openid',
  });
  expect((await GET(new Request(`${origin}/oauth2/managed?${query}`))).status).toBe(200);
  query.set('redirect_uri', 'https://evil.test/callback');
  expect((await GET(new Request(`${origin}/oauth2/managed?${query}`))).status).toBe(400);

  const signUp = await POST(
    request('signup', { password: 'Secure1!pass', email: 'managed@example.test' }),
  );
  expect(signUp.status).toBe(200);
  const user = await prismaClient.user.findFirstOrThrow({ where: { name: 'managed-user' } });
  assert(user.confirmationCode);
  expect((await POST(request('confirm', { code: user.confirmationCode }))).status).toBe(200);
  expect((await POST(request('login', { password: 'wrong' }))).status).toBe(400);

  query.set('redirect_uri', redirectUri);
  query.set('state', 'client-state');
  query.set('code_challenge', challenge);
  query.set('code_challenge_method', 'S256');
  expect((await GET(new Request(`${origin}/oauth2/managed?${query}`))).status).toBe(200);

  const signedIn = await POST(
    request('login', {
      password: 'Secure1!pass',
      state: 'client-state',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }),
  );
  expect(signedIn.status).toBe(200);
  const result = (await signedIn.json()) as { redirect: string };
  const redirect = new URL(result.redirect);
  expect(redirect.origin).toBe('https://example.test');
  expect(redirect.searchParams.get('state')).toBe('client-state');
  const code = redirect.searchParams.get('code');
  assert(code);

  const grant = {
    grant_type: 'authorization_code' as const,
    client_id: brandedId.userPoolClient.maybe.parse(client.id),
    redirect_uri: redirectUri,
    code,
    code_verifier: verifier,
  };
  await expect(
    managedLoginUseCase.exchangeCode({ ...grant, code_verifier: 'wrong' }),
  ).rejects.toThrow();
  const tokens = await managedLoginUseCase.exchangeCode(grant);
  expect(tokens?.id_token).toBeTruthy();
  expect(await managedLoginUseCase.exchangeCode(grant)).toBeNull();

  // The same endpoint also supports a plain PKCE challenge and rejects reused or expired grants.
  const plainCode = await managedLoginUseCase.authorize({
    clientId: client.id,
    redirectUri,
    scope: 'openid',
    username: 'managed-user',
    password: 'Secure1!pass',
    codeChallenge: verifier,
    codeChallengeMethod: 'plain',
  });
  await expect(
    managedLoginUseCase.exchangeCode({
      ...grant,
      code: plainCode,
      redirect_uri: 'https://wrong.test',
    }),
  ).rejects.toThrow();
  await expect(
    managedLoginUseCase.exchangeCode({
      ...grant,
      code: plainCode,
      client_id: brandedId.userPoolClient.maybe.parse('wrong'),
    }),
  ).rejects.toThrow();
  expect(
    (await managedLoginUseCase.exchangeCode({ ...grant, code: plainCode }))?.access_token,
  ).toBeTruthy();

  const expiredCode = await managedLoginUseCase.authorize({
    clientId: client.id,
    redirectUri,
    scope: 'openid',
    username: 'managed-user',
    password: 'Secure1!pass',
  });
  await prismaClient.oAuthAuthorizationCode.update({
    where: { code: expiredCode },
    data: { expiresAt: new Date(0) },
  });
  await expect(managedLoginUseCase.exchangeCode({ ...grant, code: expiredCode })).rejects.toThrow();

  const withoutPkce = await managedLoginUseCase.authorize({
    clientId: client.id,
    redirectUri,
    scope: 'openid',
    username: 'managed-user',
    password: 'Secure1!pass',
  });
  expect(
    (await managedLoginUseCase.exchangeCode({ ...grant, code: withoutPkce, code_verifier: '' }))
      ?.id_token,
  ).toBeTruthy();

  await expect(
    managedLoginUseCase.authorize({
      clientId: client.id,
      redirectUri,
      scope: 'openid',
      username: 'missing',
      password: 'bad',
    }),
  ).rejects.toThrow();
  await prismaClient.user.update({ where: { id: user.id }, data: { enabledTotp: true } });
  await expect(
    managedLoginUseCase.authorize({
      clientId: client.id,
      redirectUri,
      scope: 'openid',
      username: 'managed-user',
      password: 'Secure1!pass',
    }),
  ).rejects.toThrow('Unsupported authentication flow.');
});

test('Managed Login validates requests and supports confirmation and password recovery', async () => {
  const client = await prismaClient.userPoolClient.update({
    where: { id: DEFAULT_USER_POOL_CLIENT_ID },
    data: {
      allowedOAuthFlowsUserPoolClient: true,
      allowedOAuthFlows: ['code'],
      allowedOAuthScopes: ['openid'],
      callbackUrls: [redirectUri],
    },
  });
  await enableManagedDomain(client.userPoolId);
  expect(await loadManagedLoginConfig('missing')).toBeNull();
  expect(await validateManagedLoginRequest({ clientId: 'missing', redirectUri })).toBeNull();
  expect(await validateManagedLoginRequest({ clientId: client.id, redirectUri })).not.toBeNull();
  const valid = { client_id: client.id, redirect_uri: redirectUri, scope: 'openid' };
  const validQuery = new URLSearchParams(valid);
  const invalidGet = await GET(new Request(`${origin}/oauth2/managed`));
  expect(invalidGet.status).toBe(400);
  expect(await invalidGet.json()).toEqual({ error: 'Invalid authorization request.' });
  expect(
    (await GET(new Request(`${origin}/oauth2/managed?${validQuery}&page=confirm`))).status,
  ).toBe(403);
  expect((await GET(new Request(`${origin}/oauth2/managed?${validQuery}&page=reset`))).status).toBe(
    403,
  );
  expect(
    (
      await GET(
        new Request(
          `${origin}/oauth2/managed?${new URLSearchParams({ ...valid, scope: 'email' })}`,
        ),
      )
    ).status,
  ).toBe(400);
  expect((await GET(new Request(`${origin}/oauth2/managed?${validQuery}`))).status).toBe(200);
  expect(
    (
      await POST(
        new Request(`${origin}/oauth2/managed`, {
          method: 'POST',
          headers: { origin: 'https://wrong.test' },
          body: '{}',
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await POST(
        new Request(`${origin}/oauth2/managed`, {
          method: 'POST',
          headers: { origin: 'invalid' },
          body: '{}',
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await POST(
        new Request(`${origin}/oauth2/managed`, {
          method: 'POST',
          body: '{}',
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await POST(
        new Request(`${origin}/oauth2/managed`, {
          method: 'POST',
          headers: { origin: 'https://localhost:5051', host: 'localhost:5051' },
          body: '{}',
        }),
      )
    ).status,
  ).toBe(400);
  const invalidPost = await POST(
    new Request(`${origin}/oauth2/managed`, { method: 'POST', headers: { origin }, body: '{' }),
  );
  expect(invalidPost.status).toBe(400);
  expect(await invalidPost.json()).toEqual({ error: 'Invalid request.' });
  expect(
    (
      await POST(
        new Request(`${origin}/oauth2/managed`, {
          method: 'POST',
          headers: { origin, 'Content-Type': 'application/json' },
          body: '{}',
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (await POST(request('login', { password: 'x', redirect_uri: 'https://wrong.test' }))).status,
  ).toBe(400);
  expect((await POST(request('login', {}))).status).toBe(400);
  expect((await POST(request('signup', { password: 'Secure1!pass' }))).status).toBe(400);
  expect((await POST(request('confirm', { code: '1' }))).status).toBe(403);
  expect((await POST(request('forgot', { username: 'missing' }))).status).toBe(400);

  expect(
    (await POST(request('signup', { password: 'Secure1!pass', email: 'managed@example.test' })))
      .status,
  ).toBe(200);
  const user = await prismaClient.user.findFirstOrThrow({ where: { name: 'managed-user' } });
  const confirmPage = await GET(
    new Request(`${origin}/oauth2/managed?${validQuery}&page=confirm`, {
      headers: { Cookie: stringifyCookie(browserCookies) },
    }),
  );
  expect(confirmPage.status).toBe(200);
  expect(((await confirmPage.json()) as { username: string }).username).toBe('managed-user');
  expect((await POST(request('resend', {}))).status).toBe(200);
  expect((await POST(request('confirm', {}))).status).toBe(400);
  expect((await POST(request('login', { password: 'Secure1!pass' }))).status).toBe(400);
  assert(user.confirmationCode);
  expect((await POST(request('confirm', { code: user.confirmationCode }))).status).toBe(200);
  expect((await POST(request('forgot', {}))).status).toBe(200);
  expect(
    (
      await GET(
        new Request(`${origin}/oauth2/managed?${validQuery}&page=reset`, {
          headers: { Cookie: stringifyCookie(browserCookies) },
        }),
      )
    ).status,
  ).toBe(200);
  expect((await POST(request('reset', { code: '1' }))).status).toBe(400);
  const forgotten = await prismaClient.user.findUniqueOrThrow({ where: { id: user.id } });
  assert(forgotten.confirmationCode);
  expect(
    (
      await POST(
        request('reset', { code: forgotten.confirmationCode, password: 'NewSecure1!pass' }),
      )
    ).status,
  ).toBe(200);
  const afterResetLogin = await POST(request('login', { password: 'NewSecure1!pass' }));
  expect(await afterResetLogin.json()).toEqual({ redirect: expect.any(String) });

  expect(
    (await POST(request('signup', { password: 'Secure1!pass', email: 'managed@example.test' })))
      .status,
  ).toBe(403);
  expect((await GET(new Request(`${origin}/oauth2/managed?${validQuery}`))).status).toBe(200);

  const mocked = vi.spyOn(signUpUseCase, 'signUp').mockRejectedValueOnce('non-error');
  expect(
    (await POST(request('signup', { password: 'Secure1!pass', email: 'managed@example.test' })))
      .status,
  ).toBe(400);
  mocked.mockRestore();

  await prismaClient.userPool.update({
    where: { id: client.userPoolId },
    data: { adminCreateUserOnly: true },
  });
  expect(
    (await POST(request('signup', { password: 'Secure1!pass', email: 'another@example.test' })))
      .status,
  ).toBe(400);
  await prismaClient.userPoolClient.update({
    where: { id: client.id },
    data: { supportedIdentityProviders: [] },
  });
  expect((await POST(request('login', { password: 'NewSecure1!pass' }))).status).toBe(400);
  await expect(
    managedLoginUseCase.authorize({
      clientId: client.id,
      redirectUri,
      scope: 'openid',
      username: 'managed-user',
      password: 'NewSecure1!pass',
    }),
  ).rejects.toThrow();
});

test('Managed Login rejects forged, expired, and cross-request CSRF state', async () => {
  const client = await prismaClient.userPoolClient.update({
    where: { id: DEFAULT_USER_POOL_CLIENT_ID },
    data: {
      allowedOAuthFlowsUserPoolClient: true,
      allowedOAuthFlows: ['code'],
      allowedOAuthScopes: ['openid'],
      callbackUrls: [redirectUri],
    },
    include: { UserPool: true },
  });
  await enableManagedDomain(client.userPoolId);
  const query = new URLSearchParams({
    client_id: client.id,
    redirect_uri: redirectUri,
    scope: 'openid',
  });
  const initial = await GET(new Request(`${origin}/oauth2/managed?${query}`));
  expect(initial.status).toBe(200);
  expect(browserCookies[MANAGED_LOGIN_FLOW_COOKIE_NAME]).toBeTruthy();
  expect(browserCookies[MANAGED_LOGIN_XSRF_COOKIE_NAME]).toBe(csrfToken);

  const login = () => request('login', { password: 'unknown' });
  expect((await POST(withHeaders(login(), { Cookie: null }))).status).toBe(403);
  expect((await POST(withHeaders(login(), { 'X-XSRF-TOKEN': null }))).status).toBe(403);
  expect((await POST(withHeaders(login(), { 'X-XSRF-TOKEN': 'wrong' }))).status).toBe(403);
  expect(
    (
      await POST(
        withHeaders(login(), {
          Cookie: stringifyCookie({ ...browserCookies, [MANAGED_LOGIN_XSRF_COOKIE_NAME]: 'wrong' }),
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await POST(
        withHeaders(login(), {
          Cookie: stringifyCookie({
            ...browserCookies,
            [MANAGED_LOGIN_FLOW_COOKIE_NAME]: 'tampered',
          }),
        }),
      )
    ).status,
  ).toBe(403);
  expect((await POST(request('login', { password: 'unknown', state: 'another-tab' }))).status).toBe(
    403,
  );
  expect((await POST(request('resend', {}))).status).toBe(403);
  expect((await POST(request('reset', { code: '123', password: 'Secure1!pass' }))).status).toBe(
    403,
  );

  const confirm = new Request(`${origin}/oauth2/managed?${query}&page=confirm`, {
    headers: { Cookie: stringifyCookie(browserCookies) },
  });
  expect((await GET(confirm)).status).toBe(403);
  expect(
    (
      await GET(
        new Request(`${origin}/oauth2/managed?${query}&state=another-tab&page=reset`, {
          headers: { Cookie: stringifyCookie(browserCookies) },
        }),
      )
    ).status,
  ).toBe(403);

  const expired = createManagedLoginFlow({
    clientId: client.id,
    redirectUri,
    scope: 'openid',
    state: '',
    codeChallenge: '',
    codeChallengeMethod: '',
  });
  expired.expiresAt = Date.now() - 1;
  const expiredCookie = stringifyCookie({
    ...browserCookies,
    [MANAGED_LOGIN_FLOW_COOKIE_NAME]: signManagedLoginFlow(expired, client.UserPool.privateKey),
  });
  expect((await POST(withHeaders(login(), { Cookie: expiredCookie }))).status).toBe(403);
  expect((await GET(withHeaders(confirm, { Cookie: expiredCookie }))).status).toBe(403);
  expect((await POST(request('login', { password: 'unknown' }))).status).toBe(400);
  expect((await GET(new Request(`${origin}/oauth2/managed?${query}&page=signup`))).status).toBe(
    200,
  );
  expect((await GET(new Request(`${origin}/oauth2/managed?${query}&page=forgot`))).status).toBe(
    200,
  );
});

// oxlint-disable-next-line complexity
test('Managed Login uses only assigned providers, enabled flows and matching assets', async () => {
  const client = await prismaClient.userPoolClient.findUniqueOrThrow({
    where: { id: DEFAULT_USER_POOL_CLIENT_ID },
  });
  expect(await loadManagedLoginConfig(client.id)).toBeNull();
  await prismaClient.userPoolClient.update({
    where: { id: client.id },
    data: {
      allowedOAuthFlowsUserPoolClient: true,
      allowedOAuthFlows: ['implicit'],
    },
  });
  expect(await loadManagedLoginConfig(client.id)).toBeNull();
  await prismaClient.userPoolClient.update({
    where: { id: client.id },
    data: {
      allowedOAuthFlows: ['code'],
      supportedIdentityProviders: ['COGNITO', 'Google'],
      callbackUrls: [redirectUri],
      allowedOAuthScopes: ['openid'],
    },
  });
  await prismaClient.userPoolDomain.create({
    data: {
      domain: 'managed',
      userPoolId: client.userPoolId,
      managedLoginVersion: 1,
      createdAt: new Date(),
    },
  });
  expect(await loadManagedLoginConfig(client.id)).toBeNull();
  await prismaClient.userPoolDomain.update({
    where: { domain: 'managed' },
    data: { managedLoginVersion: 2 },
  });
  expect((await loadManagedLoginConfig(client.id))?.providers).toEqual([]);
  await prismaClient.identityProvider.createMany({
    data: [
      {
        userPoolId: client.userPoolId,
        providerName: 'Google',
        providerType: 'Google',
        providerDetails: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userPoolId: client.userPoolId,
        providerName: 'Custom',
        providerType: 'OIDC',
        providerDetails: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });
  expect((await loadManagedLoginConfig(client.id))?.providers).toEqual(['Google']);
  await prismaClient.userPoolClient.update({
    where: { id: client.id },
    data: { supportedIdentityProviders: ['COGNITO', 'Google', 'Custom'] },
  });
  expect((await loadManagedLoginConfig(client.id))?.providers).toEqual(['Google']);
  await prismaClient.userPoolDomain.create({
    data: {
      domain: 'classic',
      userPoolId: client.userPoolId,
      managedLoginVersion: 1,
      createdAt: new Date(),
    },
  });
  await prismaClient.userPoolDomain.create({
    data: {
      domain: 'classic.example.test',
      userPoolId: client.userPoolId,
      managedLoginVersion: 1,
      createdAt: new Date(),
    },
  });
  expect(await loadManagedLoginConfig(client.id, 'classic.auth.example.test')).toBeNull();
  expect(await loadManagedLoginConfig(client.id, 'classic.example.test')).toBeNull();
  expect(await loadManagedLoginConfig(client.id, 'classic.example.test.auth.fake')).toBeNull();
  expect(await loadManagedLoginConfig(client.id, 'unknown.example.test')).toBeNull();
  expect((await loadManagedLoginConfig(client.id, 'managed.auth.example.test'))?.providers).toEqual(
    ['Google'],
  );
  expect((await loadManagedLoginConfig(client.id, 'managed'))?.providers).toEqual(['Google']);
  const domainQuery = new URLSearchParams({
    client_id: client.id,
    redirect_uri: redirectUri,
    scope: 'openid',
  });
  expect(
    (await GET(new Request(`http://classic.auth.example.test/oauth2/managed?${domainQuery}`)))
      .status,
  ).toBe(400);
  expect(
    (await GET(new Request(`http://managed.auth.example.test/oauth2/managed?${domainQuery}`)))
      .status,
  ).toBe(200);
  await prismaClient.userPool.update({
    where: { id: client.userPoolId },
    data: {
      name: null,
      adminCreateUserOnly: true,
      allowedFirstAuthFactors: [],
    },
  });
  expect(await loadManagedLoginConfig(client.id)).toMatchObject({
    poolName: 'Sign in',
    allowPassword: false,
    allowSignUp: false,
  });
  await prismaClient.managedLoginBranding.create({
    data: {
      id: 'assets',
      userPoolId: client.userPoolId,
      clientId: client.id,
      settings: { categories: { global: { colorSchemeMode: 'DARK' } } },
      createdAt: new Date(),
      updatedAt: new Date(),
      assets: {
        create: [
          {
            id: 'light',
            category: 'FORM_LOGO',
            colorMode: 'LIGHT',
            extension: 'PNG',
            bytes: Buffer.from([1]),
            position: 0,
          },
          {
            id: 'svg',
            category: 'FORM_LOGO',
            colorMode: 'DARK',
            extension: 'SVG',
            bytes: Buffer.from([2]),
            position: 1,
          },
          {
            id: 'jpg',
            category: 'PAGE_BACKGROUND',
            colorMode: 'DARK',
            extension: 'JPG',
            bytes: Buffer.from([3]),
            position: 2,
          },
          {
            id: 'empty',
            category: 'FORM_BACKGROUND',
            colorMode: 'DARK',
            extension: 'PNG',
            position: 3,
          },
        ],
      },
    },
  });
  expect((await loadManagedLoginConfig(client.id))?.assets).toEqual([
    { category: 'FORM_LOGO', url: 'data:image/svg+xml;base64,Ag==' },
    { category: 'PAGE_BACKGROUND', url: 'data:image/jpeg;base64,Aw==' },
  ]);
});
