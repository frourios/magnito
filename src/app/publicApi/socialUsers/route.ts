import { userQuery } from 'server/domain/user/store/userQuery';
import { socialUseCase } from 'server/domain/user/useCase/socialUseCase';
import { prismaClient } from 'server/service/prismaClient';
import { createRoute } from './frourio.server';

export const { GET, POST, PATCH } = createRoute({
  get: async ({ query }) => {
    return { status: 200, body: await userQuery.listSocials(prismaClient, query.userPoolClientId) };
  },
  post: async ({ body }) => {
    return { status: 200, body: await socialUseCase.createUser(body) };
  },
  patch: async ({ body }) => {
    return { status: 200, body: await socialUseCase.updateCodeChallenge(body) };
  },
});
