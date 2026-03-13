import { createDecoder } from 'fast-jwt';
import { NextResponse } from 'next/server';
import { IdTokenJwtSchema } from 'schemas/jwt';
import { userQuery } from 'server/domain/user/store/userQuery';
import { userPoolQuery } from 'server/domain/userPool/store/userPoolQuery';
import { COOKIE_NAME, COOKIE_OPTIONS } from 'server/service/constants';
import { customAssert } from 'server/service/customAssert';
import { parseJwtUser } from 'server/service/parseJwtUser';
import { prismaClient } from 'server/service/prismaClient';
import { createRoute } from './frourio.server';

const decoder = createDecoder({ complete: true });

export const { middleware } = createRoute({
  async middleware({ req, next }) {
    const cookie = req.cookies.get(COOKIE_NAME);

    customAssert(cookie, 'Eliminate fraudulent requests');

    const payload = IdTokenJwtSchema.safeParse(decoder(cookie.value));

    customAssert(payload.success, 'Eliminate fraudulent requests');

    const poolInfo = await userPoolQuery.findJwksInfo(prismaClient, payload.data.sub);
    const jwtResult = await parseJwtUser(payload.data, poolInfo);

    if (!jwtResult) {
      const res = NextResponse.json({ message: 'Token expired.' }, { status: 403 });

      res.cookies.delete({ ...COOKIE_OPTIONS, name: COOKIE_NAME });

      return res;
    }

    return userQuery.findById(prismaClient, jwtResult.sub).then((user) => next({ user }));
  },
});
