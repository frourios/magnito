import assert from 'assert';
import type {
  CreateUserPoolClientTarget,
  CreateUserPoolTarget,
  DeleteUserPoolClientTarget,
  DeleteUserPoolTarget,
  ListUserPoolClientsTarget,
  ListUserPoolsTarget,
} from 'common/types/auth';
import { prismaClient, transaction } from 'server/service/prismaClient';
import { DEFAULT_USER_POOL_CLIENT_ID, DEFAULT_USER_POOL_ID } from 'server/service/serverEnvs';
import { userPoolMethod } from '../model/userPoolMethod';
import { userPoolCommand } from '../store/userPoolCommand';
import { userPoolQuery } from '../store/userPoolQuery';

export const userPoolUseCase = {
  initDefaults: (): Promise<void> =>
    transaction(async (tx) => {
      await userPoolQuery
        .findById(prismaClient, DEFAULT_USER_POOL_ID)
        .catch(() =>
          userPoolCommand.save(
            tx,
            userPoolMethod.create({ id: DEFAULT_USER_POOL_ID, name: 'defaultPool' }),
          ),
        );

      await userPoolQuery.findClientById(prismaClient, DEFAULT_USER_POOL_CLIENT_ID).catch(() =>
        userPoolCommand.saveClient(
          tx,
          userPoolMethod.createClient({
            id: DEFAULT_USER_POOL_CLIENT_ID,
            userPoolId: DEFAULT_USER_POOL_ID,
            name: 'defaultPoolClient',
          }),
        ),
      );
    }),
  listUserPools: async (
    req: ListUserPoolsTarget['reqBody'],
  ): Promise<ListUserPoolsTarget['resBody']> => {
    const pools = await userPoolQuery.listAll(prismaClient, req.MaxResults);

    return { UserPools: pools.map((p) => ({ Id: p.id, Name: p.name })) };
  },
  listUserPoolClients: async (
    req: ListUserPoolClientsTarget['reqBody'],
  ): Promise<ListUserPoolClientsTarget['resBody']> => {
    assert(req.UserPoolId);

    const clients = await userPoolQuery.listClientAll(prismaClient, req.UserPoolId, req.MaxResults);

    return { UserPoolClients: clients.map((c) => ({ ClientId: c.id, ClientName: c.name })) };
  },
  createUserPool: (
    req: CreateUserPoolTarget['reqBody'],
  ): Promise<CreateUserPoolTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.PoolName);

      const pool = userPoolMethod.create({ name: req.PoolName });
      await userPoolCommand.save(tx, pool);

      return { UserPool: { Id: pool.id, Name: pool.name } };
    }),
  createUserPoolClient: (
    req: CreateUserPoolClientTarget['reqBody'],
  ): Promise<CreateUserPoolClientTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.ClientName);
      assert(req.UserPoolId);

      const pool = await userPoolQuery.findById(tx, req.UserPoolId);
      const client = userPoolMethod.createClient({ name: req.ClientName, userPoolId: pool.id });
      await userPoolCommand.saveClient(tx, client);

      return {
        UserPoolClient: { ClientId: client.id, UserPoolId: pool.id, ClientName: client.name },
      };
    }),
  deleteUserPool: (
    req: DeleteUserPoolTarget['reqBody'],
  ): Promise<DeleteUserPoolTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.UserPoolId);

      const pool = await userPoolQuery.findById(tx, req.UserPoolId);

      await userPoolCommand.delete(tx, userPoolMethod.deleteUserPool(pool));

      return {};
    }),
  deleteUserPoolClient: (
    req: DeleteUserPoolClientTarget['reqBody'],
  ): Promise<DeleteUserPoolClientTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.ClientId);

      const client = await userPoolQuery.findClientById(tx, req.ClientId);

      await userPoolCommand.deleteClient(tx, userPoolMethod.deleteUserPoolClient(client));

      return {};
    }),
};
