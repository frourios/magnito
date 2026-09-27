import { NextResponse } from 'vinext/shims/server';
import { z } from 'zod';
import { userPoolQuery } from '../../../../../server/domain/userPool/store/userPoolQuery';
import {
  SOCIAL_FLOW_COOKIE_NAME,
  SOCIAL_FLOW_COOKIE_OPTIONS,
} from '../../../../../server/service/constants';
import { prismaClient } from '../../../../../server/service/prismaClient';
import {
  DEFAULT_USER_POOL_CLIENT_ID,
  DEFAULT_USER_POOL_ID,
} from '../../../../../server/service/serverEnvs';
import { createSocialOAuthFlow } from '../../../../../server/service/socialOAuthFlow';
import { PROVIDER_LIST } from '../../../../schemas/constants';

export const GET = async (req: Request): Promise<NextResponse> => {
  const url = new URL(req.url);
  const provider = z.enum(PROVIDER_LIST).safeParse(url.searchParams.get('provider'));

  if (!provider.success) return new NextResponse(null, { status: 400 });

  const pool = await userPoolQuery.findById(prismaClient, DEFAULT_USER_POOL_ID);
  const flow = createSocialOAuthFlow(pool.privateKey);
  const authorizeUrl = new URL('/oauth2/authorize', url.origin);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', DEFAULT_USER_POOL_CLIENT_ID);
  authorizeUrl.searchParams.set('identity_provider', provider.data);
  authorizeUrl.searchParams.set('redirect_uri', `${url.origin}/oauth2/server/callback`);
  authorizeUrl.searchParams.set('scope', 'openid profile');
  authorizeUrl.searchParams.set('state', flow.state);
  authorizeUrl.searchParams.set('code_challenge', flow.challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  const res = new NextResponse(null, {
    status: 302,
    headers: { Location: authorizeUrl.toString() },
  });
  res.cookies.set(SOCIAL_FLOW_COOKIE_NAME, flow.cookie, SOCIAL_FLOW_COOKIE_OPTIONS);

  return res;
};
