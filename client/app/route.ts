import { createRoute } from './frourio.server';

export const { GET } = createRoute({
  async get() {
    return {
      status: 200,
      body: '<script>location.replace("./login")</script>',
      headers: { 'Content-Type': 'text/html' },
    };
  },
});
