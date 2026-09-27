/* oxlint-disable max-depth, max-lines */
import { parseCookie } from 'cookie';
import { NextResponse } from 'vinext/shims/server';
import { authUseCase } from '../../../../server/domain/user/useCase/authUseCase';
import { managedLoginUseCase } from '../../../../server/domain/user/useCase/managedLoginUseCase';
import { signUpUseCase } from '../../../../server/domain/user/useCase/signUpUseCase';
import { validateManagedLoginRequest } from '../../../../server/domain/userPool/service/managedLoginConfig';
import {
  MANAGED_LOGIN_FLOW_COOKIE_NAME,
  MANAGED_LOGIN_FLOW_COOKIE_OPTIONS,
  MANAGED_LOGIN_XSRF_COOKIE_NAME,
  MANAGED_LOGIN_XSRF_COOKIE_OPTIONS,
} from '../../../../server/service/constants';
import {
  createManagedLoginFlow,
  matchesManagedLoginFlow,
  matchesXsrfToken,
  permitsManagedLoginAction,
  readManagedLoginFlow,
  signManagedLoginFlow,
  type ManagedLoginFlow,
  type ManagedLoginFlowRequest,
} from '../../../../server/service/managedLoginCsrf';
import { prismaClient } from '../../../../server/service/prismaClient';
import { brandedId } from '../../../schemas/brandedId';
import { createRoute } from './frourio.server';

const failure = (message: string, status = 400): NextResponse =>
  NextResponse.json({ error: message }, { status });

const requestHostname = (requestUrl: string, host?: string): string =>
  new URL(`http://${host ?? new URL(requestUrl).host}`).hostname;

const flowRequest = (input: {
  client_id: string;
  redirect_uri: string;
  scope: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}): ManagedLoginFlowRequest => ({
  clientId: input.client_id,
  redirectUri: input.redirect_uri,
  scope: input.scope,
  state: input.state ?? '',
  codeChallenge: input.code_challenge ?? '',
  codeChallengeMethod: input.code_challenge_method ?? '',
});

const cookiesFrom = (cookie?: string): Record<string, string | undefined> =>
  parseCookie(cookie ?? '');

const setFlowCookie = (res: NextResponse, flow: ManagedLoginFlow, privateKey: string): void => {
  res.cookies.set(
    MANAGED_LOGIN_FLOW_COOKIE_NAME,
    signManagedLoginFlow(flow, privateKey),
    MANAGED_LOGIN_FLOW_COOKIE_OPTIONS,
  );
};

const nextStep = (
  phase: ManagedLoginFlow['phase'],
  flow: ManagedLoginFlow,
  privateKey: string,
  username?: string,
): NextResponse => {
  const res = NextResponse.json({ next: phase === 'entry' ? 'login' : phase });
  setFlowCookie(res, { ...flow, phase, username }, privateKey);
  return res;
};

export const { GET, POST } = createRoute({
  // oxlint-disable-next-line complexity
  get: async ({ query, headers }, { requestUrl }) => {
    const config = await validateManagedLoginRequest({
      clientId: query.client_id,
      redirectUri: query.redirect_uri,
      scope: query.scope,
      hostname: requestHostname(requestUrl, headers.host),
    });
    if (!config) return failure('Invalid authorization request.');
    const client = await prismaClient.userPoolClient.findUniqueOrThrow({
      where: { id: query.client_id },
      include: { UserPool: true },
    });
    const request = flowRequest(query);
    const page = query.page;
    if (page === 'confirm' || page === 'reset') {
      const flow = readManagedLoginFlow(
        cookiesFrom(headers.cookie)[MANAGED_LOGIN_FLOW_COOKIE_NAME],
        client.UserPool.privateKey,
      );
      if (!flow || !matchesManagedLoginFlow(flow, request) || flow.phase !== page) {
        return failure('Invalid CSRF token.', 403);
      }
      return NextResponse.json({ ...config, csrfToken: flow.xsrfToken, username: flow.username });
    }

    const flow = createManagedLoginFlow(request);
    const res = NextResponse.json({ ...config, csrfToken: flow.xsrfToken });
    setFlowCookie(res, flow, client.UserPool.privateKey);
    res.cookies.set(
      MANAGED_LOGIN_XSRF_COOKIE_NAME,
      flow.xsrfToken,
      MANAGED_LOGIN_XSRF_COOKIE_OPTIONS,
    );
    return res;
  },

  // oxlint-disable-next-line complexity
  post: async ({ headers, body }, { requestUrl }) => {
    const input = body;
    const config = await validateManagedLoginRequest({
      clientId: input.client_id,
      redirectUri: input.redirect_uri,
      scope: input.scope,
      hostname: requestHostname(requestUrl, headers.host),
    });
    if (!config) return failure('Invalid authorization request.');

    try {
      const client = await prismaClient.userPoolClient.findUniqueOrThrow({
        where: { id: input.client_id },
        include: { UserPool: true },
      });
      const cookies = cookiesFrom(headers.cookie);
      const flow = readManagedLoginFlow(
        cookies[MANAGED_LOGIN_FLOW_COOKIE_NAME],
        client.UserPool.privateKey,
      );
      if (
        !flow ||
        !matchesManagedLoginFlow(flow, flowRequest(input)) ||
        !matchesXsrfToken(
          flow,
          cookies[MANAGED_LOGIN_XSRF_COOKIE_NAME],
          headers['x-xsrf-token'] ?? null,
        ) ||
        !permitsManagedLoginAction(flow, input.action, input.username)
      ) {
        return failure('Invalid CSRF token.', 403);
      }
      if (input.action === 'login') {
        if (!input.password || !config.allowPassword) return failure('Invalid request.');
        const code = await managedLoginUseCase.authorize({
          clientId: input.client_id,
          redirectUri: input.redirect_uri,
          scope: input.scope,
          codeChallenge: input.code_challenge,
          codeChallengeMethod: input.code_challenge_method,
          username: input.username,
          password: input.password,
        });
        const redirect = new URL(input.redirect_uri);
        redirect.searchParams.set('code', code);
        if (input.state) redirect.searchParams.set('state', input.state);
        const res = NextResponse.json({ redirect: redirect.toString() });
        res.cookies.set(MANAGED_LOGIN_FLOW_COOKIE_NAME, '', {
          ...MANAGED_LOGIN_FLOW_COOKIE_OPTIONS,
          maxAge: 0,
        });
        res.cookies.set(MANAGED_LOGIN_XSRF_COOKIE_NAME, '', {
          ...MANAGED_LOGIN_XSRF_COOKIE_OPTIONS,
          maxAge: 0,
        });
        return res;
      }
      if (input.action === 'signup') {
        if (!config.allowSignUp || !config.allowPassword || !input.password || !input.email) {
          return failure('Invalid request.');
        }
        await signUpUseCase.signUp({
          ClientId: brandedId.userPoolClient.maybe.parse(input.client_id),
          Username: input.username,
          Password: input.password,
          UserAttributes: [{ Name: 'email', Value: input.email }],
        });
        return nextStep('confirm', flow, client.UserPool.privateKey, input.username);
      }

      const user = await prismaClient.user.findFirst({
        where: { name: input.username, userPoolId: client.userPoolId, kind: 'cognito' },
      });
      if (!user) return failure('Account was not found.');
      if (input.action === 'confirm' && input.code) {
        await signUpUseCase.confirmSignUp({
          ClientId: brandedId.userPoolClient.maybe.parse(input.client_id),
          Username: input.username,
          ConfirmationCode: input.code,
        });
        return nextStep('entry', flow, client.UserPool.privateKey);
      }
      if (input.action === 'resend') {
        await signUpUseCase.resendConfirmationCode({
          ClientId: brandedId.userPoolClient.maybe.parse(input.client_id),
          Username: input.username,
        });
        return NextResponse.json({ next: 'confirm' });
      }
      if (input.action === 'forgot') {
        await authUseCase.forgotPassword({
          ClientId: brandedId.userPoolClient.maybe.parse(input.client_id),
          Username: input.username,
        });
        return nextStep('reset', flow, client.UserPool.privateKey, input.username);
      }
      if (input.action === 'reset' && input.code && input.password) {
        await authUseCase.confirmForgotPassword({
          ClientId: brandedId.userPoolClient.maybe.parse(input.client_id),
          Username: input.username,
          ConfirmationCode: input.code,
          Password: input.password,
        });
        return nextStep('entry', flow, client.UserPool.privateKey);
      }
      return failure('Invalid request.');
    } catch (error) {
      return failure(error instanceof Error ? error.message : 'Request failed.');
    }
  },
});
