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
import { createRoute } from './frourio.server';

const invalidResponse = (): NextResponse => {
  const res = new NextResponse(null, { status: 400 });
  res.cookies.delete({ ...SOCIAL_FLOW_COOKIE_OPTIONS, name: SOCIAL_FLOW_COOKIE_NAME });

  return res;
};

export const { GET } = createRoute({
  // oxlint-disable-next-line complexity
  get: async ({ query, headers }, { requestOrigin }) => {
    const pool = await userPoolQuery.findById(prismaClient, DEFAULT_USER_POOL_ID);
    const flow = readSocialOAuthFlow(
      parseCookie(headers.cookie ?? '')[SOCIAL_FLOW_COOKIE_NAME],
      pool.privateKey,
    );
    if (!flow || !query.code || !query.state || query.state !== flow.state) {
      return invalidResponse();
    }

    const tokens = await socialUseCase
      .getTokens({
        grant_type: 'authorization_code',
        code: query.code,
        client_id: DEFAULT_USER_POOL_CLIENT_ID,
        redirect_uri: `${requestOrigin}/oauth2/server/callback`,
        code_verifier: flow.verifier,
      })
      .catch(() => null);

    if (!tokens) return invalidResponse();

    const res = new NextResponse(null, {
      status: 302,
      headers: { Location: new URL('/console', requestOrigin).toString() },
    });
    res.cookies.set(COOKIE_NAME, tokens.id_token, {
      ...COOKIE_OPTIONS,
      expires: new Date(Date.now() + tokens.expires_in * 1000),
    });
    res.cookies.delete({ ...SOCIAL_FLOW_COOKIE_OPTIONS, name: SOCIAL_FLOW_COOKIE_NAME });

    return res;
  },
});
