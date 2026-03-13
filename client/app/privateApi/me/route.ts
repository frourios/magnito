import { createRoute } from './frourio.server';

export const { GET } = createRoute({
  get: async (_, ctx) => {
    return { status: 200, body: ctx.user };
  },
});
