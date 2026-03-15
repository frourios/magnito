import { NextResponse } from 'next/server';
import { CustomError } from 'server/service/customAssert';
import { createMiddleware } from './frourio.middleware';

export const middleware = createMiddleware(({ req, next }) => {
  return next()
    .then((res) => {
      res.headers.set('Access-Control-Allow-Origin', '*');

      return res;
    })
    .catch((err) => {
      if (err instanceof Error) console.error(new Date(), err.stack);

      return new NextResponse(err instanceof CustomError ? err.message : undefined, {
        status: req.method === 'GET' ? 404 : 403,
      });
    });
});
