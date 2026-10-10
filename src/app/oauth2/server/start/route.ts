import { userPoolQuery } from '../../../../../server/domain/userPool/store/userPoolQuery';
import { SOCIAL_FLOW_COOKIE_NAME } from '../../../../../server/service/constants';
import { prismaClient } from '../../../../../server/service/prismaClient';
import {
  DEFAULT_USER_POOL_CLIENT_ID,
  DEFAULT_USER_POOL_ID,
} from '../../../../../server/service/serverEnvs';
import { createSocialOAuthFlow } from '../../../../../server/service/socialOAuthFlow';
import { createRoute } from './frourio.server';

export const { GET } = createRoute({
  get: async ({ query }, { requestOrigin }) => {
    if (!query.provider) return { status: 400 };

    const pool = await userPoolQuery.findById(prismaClient, DEFAULT_USER_POOL_ID);
    const flow = createSocialOAuthFlow(pool.privateKey);
    const authorizeUrl = new URL('/oauth2/authorize', requestOrigin);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', DEFAULT_USER_POOL_CLIENT_ID);
    authorizeUrl.searchParams.set('identity_provider', query.provider);
    authorizeUrl.searchParams.set('redirect_uri', `${requestOrigin}/oauth2/server/callback`);
    authorizeUrl.searchParams.set('scope', 'openid profile');
    authorizeUrl.searchParams.set('state', flow.state);
    authorizeUrl.searchParams.set('code_challenge', flow.challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    return {
      status: 302,
      cookies: { [SOCIAL_FLOW_COOKIE_NAME]: { command: 'set', value: flow.cookie } },
      headers: { Location: authorizeUrl.toString() },
    };
  },
});
