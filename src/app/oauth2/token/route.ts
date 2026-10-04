import { managedLoginUseCase } from '../../../../server/domain/user/useCase/managedLoginUseCase';
import { socialUseCase } from '../../../../server/domain/user/useCase/socialUseCase';
import { authenticateOAuthClient } from '../../../../server/service/oauthClientSecret';
import { SocialUserRequestTokensValSchema } from '../../../schemas/user';
import { createRoute } from './frourio.server';

export const { POST } = createRoute({
  post: async ({ body, headers }) => {
    const clientId = await authenticateOAuthClient({
      authorization: headers?.authorization,
      clientId: body.client_id,
      clientSecret: body.client_secret,
    });
    if (!clientId) return { status: 401, body: { error: 'invalid_client' } };

    const input = SocialUserRequestTokensValSchema.parse({ ...body, client_id: clientId });
    return {
      status: 200,
      body:
        (await managedLoginUseCase.exchangeCode(input)) ?? (await socialUseCase.getTokens(input)),
    };
  },
});
