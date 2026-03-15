import { createRoute } from './frourio.server';

export const { POST, DELETE } = createRoute({
  async post() {
    return { status: 200, body: { status: 'success' } };
  },
  async delete() {
    return { status: 200, body: { status: 'success' } };
  },
});
