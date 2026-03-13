import { createRoute } from './frourio.server';

export const { GET } = createRoute({
  get: async ({ query }) => {
    return new Response(null, { status: 302, headers: { Location: query.logout_uri } });
  },
});
