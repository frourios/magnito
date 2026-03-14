import { socialUseCase } from 'server/domain/user/useCase/socialUseCase';
import { createRoute } from './frourio.server';

export const { POST } = createRoute({
  post: async ({ body }) => {
    return { status: 200, body: await socialUseCase.getTokens(body) };
  },
});
