import { parseCookie } from 'cookie';
import { NextResponse } from 'vinext/shims/server';
import { socialUseCase } from '../../../../../server/domain/user/useCase/socialUseCase';
import { userPoolQuery } from '../../../../../server/domain/userPool/store/userPoolQuery';
import {
  COOKIE_NAME,
  COOKIE_OPTIONS,
  SOCIAL_FLOW_COOKIE_NAME,
  SOCIAL_FLOW_COOKIE_OPTIONS,
} from '../../../../../server/service/constants';
import { prismaClient } from '../../../../../server/service/prismaClient';
import {
  DEFAULT_USER_POOL_CLIENT_ID,
  DEFAULT_USER_POOL_ID,
} from '../../../../../server/service/serverEnvs';
import { readSocialOAuthFlow } from '../../../../../server/service/socialOAuthFlow';

const invalidResponse = (): NextResponse => {
  const res = new NextResponse(null, { status: 400 });
  res.cookies.delete({ ...SOCIAL_FLOW_COOKIE_OPTIONS, name: SOCIAL_FLOW_COOKIE_NAME });

  return res;
};

// oxlint-disable-next-line complexity
export const GET = async (req: Request): Promise<NextResponse> => {
  const url = new URL(req.url);
  const pool = await userPoolQuery.findById(prismaClient, DEFAULT_USER_POOL_ID);
  const flow = readSocialOAuthFlow(
    parseCookie(req.headers.get('cookie') ?? '')[SOCIAL_FLOW_COOKIE_NAME],
    pool.privateKey,
  );
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!flow || !code || !state || state !== flow.state) return invalidResponse();

  const tokens = await socialUseCase
    .getTokens({
      grant_type: 'authorization_code',
      code,
      client_id: DEFAULT_USER_POOL_CLIENT_ID,
      redirect_uri: `${url.origin}/oauth2/server/callback`,
      code_verifier: flow.verifier,
    })
    .catch(() => null);

  if (!tokens) return invalidResponse();

  const res = new NextResponse(null, {
    status: 302,
    headers: { Location: new URL('/console', url.origin).toString() },
  });
  res.cookies.set(COOKIE_NAME, tokens.id_token, {
    ...COOKIE_OPTIONS,
    expires: new Date(Date.now() + tokens.expires_in * 1000),
  });
  res.cookies.delete({ ...SOCIAL_FLOW_COOKIE_OPTIONS, name: SOCIAL_FLOW_COOKIE_NAME });

  return res;
};
