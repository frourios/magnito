import { createDecoder } from 'fast-jwt';
import { createVerifier } from 'fast-jwt';
import buildGetJwks from 'get-jwks';
import { NextResponse } from 'next/server';
import { TokenJwtSchema } from 'schemas/jwt';
import { userQuery } from 'server/domain/user/store/userQuery';
import { userPoolQuery } from 'server/domain/userPool/store/userPoolQuery';
import { COOKIE_NAME, COOKIE_OPTIONS } from 'server/service/constants';
import { customAssert } from 'server/service/customAssert';
import { prismaClient } from 'server/service/prismaClient';
import { PORT } from 'server/service/serverEnvs';
import { z } from 'zod';
import { createRoute } from './frourio.server';

const getJwks = buildGetJwks();
const decoder = createDecoder();

export const { middleware } = createRoute({
  async middleware({ req, next }) {
    const cookie = req.cookies.get(COOKIE_NAME);

    if (!cookie) return new NextResponse(null, { status: 401 });

    const payload = TokenJwtSchema.safeParse(decoder(cookie.value));

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
    const jwtResult = await verifyWithPromise(cookie.value).then((val) =>
      TokenJwtSchema.parse(val),
    );

    return userQuery.findById(prismaClient, jwtResult.sub).then((user) => next({ user }));
  },
});
