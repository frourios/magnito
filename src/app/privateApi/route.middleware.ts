import { parseCookie } from 'cookie';
import { createDecoder } from 'fast-jwt';
import { createVerifier } from 'fast-jwt';
import buildGetJwks from 'get-jwks';
import { NextResponse } from 'next/server';
import { userQuery } from 'server/domain/user/store/userQuery';
import { userPoolQuery } from 'server/domain/userPool/store/userPoolQuery';
import { COOKIE_NAME, COOKIE_OPTIONS } from 'server/service/constants';
import { customAssert } from 'server/service/customAssert';
import { prismaClient } from 'server/service/prismaClient';
import { PORT } from 'server/service/serverEnvs';
import { TokenJwtSchema } from 'src/schemas/jwt';
import { z } from 'zod';
import { createMiddleware } from './frourio.middleware';

const getJwks = buildGetJwks();
const decoder = createDecoder();

export const middleware = createMiddleware(async ({ req, next }) => {
  const cookieText = req.headers.get('cookie');

  if (!cookieText) return new NextResponse(null, { status: 401 });

  const parsedCookie = parseCookie(cookieText)[COOKIE_NAME];

  customAssert(parsedCookie, 'Eliminate fraudulent requests');

  const payload = TokenJwtSchema.safeParse(decoder(parsedCookie));

  customAssert(payload.success, 'Eliminate fraudulent requests');

  const poolInfo = await userPoolQuery.findJwksInfo(prismaClient, payload.data.sub);

  if (payload.data.exp * 1000 <= Date.now()) {
    const res = NextResponse.json({ message: 'Token expired.' }, { status: 403 });

    res.cookies.delete({ ...COOKIE_OPTIONS, name: COOKIE_NAME });

    return res;
  }

  const verifyWithPromise = createVerifier({
    async key(val: unknown) {
      const jwt = z
        .object({
          header: z.object({ kid: z.string(), alg: z.string() }),
          payload: z.object({ aud: z.string() }),
        })
        .parse(val);

      const publicKey = await getJwks.getPublicKey({
        kid: jwt.header.kid,
        alg: jwt.header.alg,
        domain: `http://localhost:${PORT}/${poolInfo.userPoolId}`,
      });

      return publicKey;
    },
    allowedAud: poolInfo.poolClientIds,
  });
  const jwtResult = await verifyWithPromise(parsedCookie).then((val) => TokenJwtSchema.parse(val));

  return userQuery.findById(prismaClient, jwtResult.sub).then((user) => next({ user }));
});
