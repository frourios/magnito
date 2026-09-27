import { managedLoginUseCase } from '../../../../server/domain/user/useCase/managedLoginUseCase';
import { socialUseCase } from '../../../../server/domain/user/useCase/socialUseCase';
import { createRoute } from './frourio.server';

export const { POST } = createRoute({
  post: async ({ body }) => {
    return {
      status: 200,
      body: (await managedLoginUseCase.exchangeCode(body)) ?? (await socialUseCase.getTokens(body)),
    };
  },
});
