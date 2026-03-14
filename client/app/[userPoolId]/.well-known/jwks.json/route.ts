import { userPoolQuery } from 'server/domain/userPool/store/userPoolQuery';
import { prismaClient } from 'server/service/prismaClient';
import { createRoute } from './frourio.server';

export const { GET } = createRoute({
  get: async ({ params }) => {
    return { status: 200, body: await userPoolQuery.findJwks(prismaClient, params.userPoolId) };
  },
});
