import { createDecoder } from 'fast-jwt';
import { COOKIE_NAME, COOKIE_OPTIONS } from 'server/service/constants';
import z from 'zod';
import { frourioSpec } from './frourio';
import { createMiddleware } from './frourio.middleware';

const decoder = createDecoder();

export const middleware = createMiddleware(async ({ req, next }) => {
  if (req.method === 'POST') {
    const body = frourioSpec.post.body.parse(await req.clone().json());
    const res = await next();
    const payload = z.object({ exp: z.number() }).parse(decoder(body.jwt));

    res.cookies.set(COOKIE_NAME, body.jwt, {
      ...COOKIE_OPTIONS,
      expires: new Date(payload.exp * 1000),
    });

    return res;
  }

  const res = await next();

  res.cookies.delete({ ...COOKIE_OPTIONS, name: COOKIE_NAME });

  return res;
});
