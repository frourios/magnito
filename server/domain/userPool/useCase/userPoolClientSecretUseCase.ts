import assert from 'node:assert';
import type * as Cognito from '@aws-sdk/client-cognito-identity-provider';
import { cognitoAssert } from '../../../service/cognitoAssert';
import { prismaClient } from '../../../service/prismaClient';
import { transaction } from '../../../service/transaction';
import {
  clientSecretDescriptor,
  createClientSecret,
  validateCustomClientSecret,
} from '../../../service/userPoolClientSecret';

export const userPoolClientSecretUseCase = {
  add: async (
    req: Cognito.AddUserPoolClientSecretRequest,
  ): Promise<Cognito.AddUserPoolClientSecretResponse> => {
    assert(req.UserPoolId && req.ClientId);
    validateCustomClientSecret(req.ClientSecret);
    const { UserPoolId: userPoolId, ClientId: clientId } = req;
    const secret = await transaction('Serializable', async (tx) => {
      await tx.userPoolClient.findFirstOrThrow({ where: { id: clientId, userPoolId } });
      const count = await tx.userPoolClientSecret.count({ where: { clientId } });
      cognitoAssert(count > 0, 'Cannot add a secret to a public app client.');
      cognitoAssert(count < 2, 'Maximum number of client secrets reached.');
      return createClientSecret(tx, clientId, req.ClientSecret);
    });
    return {
      ClientSecretDescriptor: clientSecretDescriptor(
        secret,
        req.ClientSecret === undefined ? secret.value : undefined,
      ),
    };
  },
  list: async (
    req: Cognito.ListUserPoolClientSecretsRequest,
  ): Promise<Cognito.ListUserPoolClientSecretsResponse> => {
    assert(req.UserPoolId && req.ClientId);
    await prismaClient.userPoolClient.findFirstOrThrow({
      where: { id: req.ClientId, userPoolId: req.UserPoolId },
    });
    const secrets = await prismaClient.userPoolClientSecret.findMany({
      where: { clientId: req.ClientId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return { ClientSecrets: secrets.map((secret) => clientSecretDescriptor(secret)) };
  },
  delete: async (
    req: Cognito.DeleteUserPoolClientSecretRequest,
  ): Promise<Cognito.DeleteUserPoolClientSecretResponse> => {
    assert(req.UserPoolId && req.ClientId && req.ClientSecretId);
    const { UserPoolId: userPoolId, ClientId: clientId, ClientSecretId: secretId } = req;
    await transaction('Serializable', async (tx) => {
      await tx.userPoolClient.findFirstOrThrow({ where: { id: clientId, userPoolId } });
      const secrets = await tx.userPoolClientSecret.findMany({ where: { clientId } });
      cognitoAssert(
        secrets.some((secret) => secret.id === secretId),
        'Client secret not found.',
      );
      cognitoAssert(secrets.length > 1, 'Cannot delete the last client secret.');
      await tx.userPoolClientSecret.delete({ where: { id: secretId } });
    });
    return {};
  },
};
