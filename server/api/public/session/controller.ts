import assert from 'assert';
import type { CookieSerializeOptions } from '@fastify/cookie';
import { COOKIE_NAME } from 'service/constants';
import { z } from 'zod';
import type { Methods } from '.';
import { defineController } from './$relay';

export type AdditionalRequest = {
  body: Methods['post']['reqBody'];
};

const options: CookieSerializeOptions = {
  httpOnly: true,
  secure: true,
  path: '/',
  sameSite: 'none',
};

export default defineController((fastify) => ({
  post: {
    validators: { body: z.object({ jwt: z.string() }) },
    hooks: {
      preHandler: (req, reply, done) => {
        assert(req.body);

        const decoded = z
          .object({ payload: z.object({ exp: z.number() }).passthrough() })
          .passthrough()
          .parse(fastify.jwt.decode(req.body.jwt));

        reply.setCookie(COOKIE_NAME, req.body.jwt, {
          ...options,
          expires: new Date(decoded.payload.exp * 1000),
        });

        done();
      },
    },
    handler: () => ({ status: 200, body: { status: 'success' } }),
  },
  delete: {
    hooks: {
      preHandler: (_, reply, done) => {
        reply.clearCookie(COOKIE_NAME, options);
        done();
      },
    },
    handler: () => ({ status: 200, body: { status: 'success' } }),
  },
}));
