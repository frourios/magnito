import { jwtDecode } from 'jwt-decode';
import { COOKIE_NAME, COOKIE_OPTIONS } from 'server/service/constants';
import { z } from 'zod';
import { frourioSpec } from './frourio';
import { createRoute } from './frourio.server';

export const { POST, DELETE, middleware } = createRoute({
  async middleware({ req, next }) {
    if (req.method === 'POST') {
      const body = frourioSpec.post.body.parse(await req.clone().json());
      const res = await next();

      const decoded = z
        .object({ payload: z.object({ exp: z.number() }).passthrough() })
        .passthrough()
        .parse(jwtDecode(body.jwt));

      res.cookies.set(COOKIE_NAME, body.jwt, {
        ...COOKIE_OPTIONS,
        expires: new Date(decoded.payload.exp * 1000),
      });

      return res;
    }

    const res = await next();

    res.cookies.delete({ ...COOKIE_OPTIONS, name: COOKIE_NAME });

    return res;
  },
  async post() {
    return { status: 200, body: { status: 'success' } };
  },
  async delete() {
    return { status: 200, body: { status: 'success' } };
  },
});
