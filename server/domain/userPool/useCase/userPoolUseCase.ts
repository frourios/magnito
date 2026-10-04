import assert from 'assert';
import type {
  CreateUserPoolClientTarget,
  CreateUserPoolTarget,
  DeleteUserPoolClientTarget,
  DeleteUserPoolTarget,
  ListUserPoolClientsTarget,
  ListUserPoolsTarget,
} from '../../../../src/schemas/auth';
import { cognitoAssert } from '../../../service/cognitoAssert';
import { prismaClient } from '../../../service/prismaClient';
import { DEFAULT_USER_POOL_CLIENT_ID, DEFAULT_USER_POOL_ID } from '../../../service/serverEnvs';
import { transaction } from '../../../service/transaction';
import {
  createClientSecret,
  validateCustomClientSecret,
} from '../../../service/userPoolClientSecret';
import { userPoolMethod } from '../model/userPoolMethod';
import { poolPolicyData, toCognitoPolicies } from '../service/poolPolicy';
import { userPoolCommand } from '../store/userPoolCommand';
import { userPoolQuery } from '../store/userPoolQuery';

export const userPoolUseCase = {
  initDefaults: (): Promise<void> =>
    transaction('RepeatableRead', async (tx) => {
      await userPoolQuery
        .findById(tx, DEFAULT_USER_POOL_ID)
        .catch(() =>
          userPoolCommand.save(
            tx,
            userPoolMethod.create({ id: DEFAULT_USER_POOL_ID, name: 'defaultPool' }),
          ),
        );

      await userPoolQuery.findClientById(tx, DEFAULT_USER_POOL_CLIENT_ID).catch(() =>
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
    // oxlint-disable-next-line complexity
    transaction('RepeatableRead', async (tx) => {
      assert(req.PoolName);

      const policy = poolPolicyData(req.Policies);

      const pool = userPoolMethod.create({ name: req.PoolName });
      await userPoolCommand.save(tx, pool);

      const resUserPool = {
        Id: pool.id,
        Name: pool.name,
        Policies: toCognitoPolicies(policy),
        MfaConfiguration: req.MfaConfiguration ?? 'OFF',
        UsernameAttributes: req.UsernameAttributes ?? [],
        AliasAttributes: req.AliasAttributes ?? [],
        AutoVerifiedAttributes: req.AutoVerifiedAttributes ?? [],
        AdminCreateUserConfig: {
          AllowAdminCreateUserOnly: !!req.AdminCreateUserConfig?.AllowAdminCreateUserOnly,
        },
      } satisfies CreateUserPoolTarget['resBody']['UserPool'];

      await tx.userPool.update({
        where: { id: pool.id },
        data: {
          ...policy,
          mfaConfiguration: resUserPool.MfaConfiguration,
          usernameAttributes: resUserPool.UsernameAttributes,
          aliasAttributes: resUserPool.AliasAttributes,
          autoVerifiedAttributes: resUserPool.AutoVerifiedAttributes,
          adminCreateUserOnly: resUserPool.AdminCreateUserConfig.AllowAdminCreateUserOnly,
        },
      });

      return { UserPool: resUserPool };
    }),
  createUserPoolClient: (
    req: CreateUserPoolClientTarget['reqBody'],
  ): Promise<CreateUserPoolClientTarget['resBody']> =>
    // oxlint-disable-next-line complexity
    transaction('RepeatableRead', async (tx) => {
      assert(req.ClientName);
      assert(req.UserPoolId);
      cognitoAssert(
        !(req.GenerateSecret && req.ClientSecret !== undefined),
        'Client secret cannot be specified when GenerateSecret is true.',
      );
      validateCustomClientSecret(req.ClientSecret);

      const pool = await userPoolQuery.findById(tx, req.UserPoolId);
      const client = userPoolMethod.createClient({ name: req.ClientName, userPoolId: pool.id });
      await userPoolCommand.saveClient(tx, client);

      const clientSecret =
        req.GenerateSecret || req.ClientSecret !== undefined
          ? (await createClientSecret(tx, client.id, req.ClientSecret)).value
          : undefined;
      const resUserPoolClient = {
        ClientId: client.id,
        UserPoolId: pool.id,
        ClientName: client.name,
        ClientSecret: clientSecret,
        ExplicitAuthFlows: req.ExplicitAuthFlows ?? [],
        SupportedIdentityProviders: req.SupportedIdentityProviders ?? ['COGNITO'],
        AllowedOAuthFlows: req.AllowedOAuthFlows ?? [],
        AllowedOAuthScopes: req.AllowedOAuthScopes ?? [],
        CallbackURLs: req.CallbackURLs ?? [],
        LogoutURLs: req.LogoutURLs ?? [],
        AllowedOAuthFlowsUserPoolClient: !!req.AllowedOAuthFlowsUserPoolClient,
        DefaultRedirectURI: req.DefaultRedirectURI,
      } satisfies CreateUserPoolClientTarget['resBody']['UserPoolClient'];

      await tx.userPoolClient.update({
        where: { id: client.id },
        data: {
          explicitAuthFlows: resUserPoolClient.ExplicitAuthFlows,
          supportedIdentityProviders: resUserPoolClient.SupportedIdentityProviders,
          allowedOAuthFlows: resUserPoolClient.AllowedOAuthFlows,
          allowedOAuthScopes: resUserPoolClient.AllowedOAuthScopes,
          callbackUrls: resUserPoolClient.CallbackURLs,
          logoutUrls: resUserPoolClient.LogoutURLs,
          allowedOAuthFlowsUserPoolClient: resUserPoolClient.AllowedOAuthFlowsUserPoolClient,
          defaultRedirectUri: resUserPoolClient.DefaultRedirectURI,
        },
      });

      return { UserPoolClient: resUserPoolClient };
    }),
  deleteUserPool: (
    req: DeleteUserPoolTarget['reqBody'],
  ): Promise<DeleteUserPoolTarget['resBody']> =>
    transaction('RepeatableRead', async (tx) => {
      assert(req.UserPoolId);

      const pool = await userPoolQuery.findById(tx, req.UserPoolId);

      await userPoolCommand.delete(tx, userPoolMethod.deleteUserPool(pool));

      return {};
    }),
  deleteUserPoolClient: (
    req: DeleteUserPoolClientTarget['reqBody'],
  ): Promise<DeleteUserPoolClientTarget['resBody']> =>
    transaction('RepeatableRead', async (tx) => {
      assert(req.ClientId);

      const client = await userPoolQuery.findClientById(tx, req.ClientId);

      await userPoolCommand.deleteClient(tx, userPoolMethod.deleteUserPoolClient(client));

      return {};
    }),
};
