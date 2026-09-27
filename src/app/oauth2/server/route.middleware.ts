import { createMiddleware } from './frourio.middleware';

export const middleware = createMiddleware(({ req, next }) =>
  next({ requestOrigin: new URL(req.url).origin }),
);
