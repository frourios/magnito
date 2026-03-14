import {
  ACCESS_KEY,
  DEFAULT_USER_POOL_CLIENT_ID,
  DEFAULT_USER_POOL_ID,
  REGION,
  SECRET_KEY,
  SSL_PORT,
} from 'server/service/serverEnvs';
import { createRoute } from './frourio.server';

export const { GET } = createRoute({
  get: async () => {
    return {
      status: 200,
      body: {
        userPoolId: DEFAULT_USER_POOL_ID,
        userPoolClientId: DEFAULT_USER_POOL_CLIENT_ID,
        region: REGION,
        accessKey: ACCESS_KEY,
        secretKey: SECRET_KEY,
        oauthDomain: `localhost:${SSL_PORT}`,
      },
    };
  },
});
