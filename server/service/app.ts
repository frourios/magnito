import assert from 'assert';
import { resolve } from 'path';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import fastifyFormbody from '@fastify/formbody';
import type { TokenOrHeader } from '@fastify/jwt';
import fastifyJwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import Fastify from 'fastify';
import buildGetJwks from 'get-jwks';
import server from '../$server';
import { COOKIE_NAME } from './constants';

export const init = (): FastifyInstance => {
  const fastify = Fastify();
  const getJwks = buildGetJwks();

  fastify.register(cors, { origin: true, credentials: true });
  fastify.register(cookie);
  fastify.register(fastifyFormbody);
  fastify.addContentTypeParser(
    'application/x-amz-json-1.1',
    { parseAs: 'string' },
    (_, body, done) => {
      done(null, JSON.parse(body as string));
    },
  );
  fastify.register(fastifyJwt, {
    cookie: { cookieName: COOKIE_NAME, signed: false },
    decode: { complete: true },
    secret: (_: FastifyRequest, token: TokenOrHeader) => {
      assert('header' in token);

      return getJwks.getPublicKey({
        kid: token.header.kid,
        domain: token.payload.iss,
        alg: token.header.alg,
      });
    },
  });

  // serve ssl oauth2 page
  fastify.register(fastifyStatic, { root: resolve('../client/out') });

  server(fastify);

  return fastify;
};
