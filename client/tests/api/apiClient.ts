import { $fc, fc } from 'app/frourio.client';
import { COOKIE_NAME } from 'server/service/constants';
import { PORT } from 'server/service/serverEnvs';

const baseURL = `http://localhost:${PORT}`;

export const noCookieClient = $fc({ baseURL });

export const lowLevelNoCookieClient = fc({ baseURL });

export const testUserName = 'test-user';

export const testPassword = 'Test-user-password1';

export const createUserClient = async (token: {
  AccessToken: string;
}): Promise<typeof noCookieClient> => {
  return $fc({
    baseURL,
    init: { headers: { cookie: `${COOKIE_NAME}=${token.AccessToken}` } },
  });
};
