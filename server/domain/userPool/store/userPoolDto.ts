import assert from 'assert';
import { brandedId } from '../../../../src/schemas/brandedId';
import type { UserPoolClientDto, UserPoolDto } from '../../../../src/schemas/userPool';
import type { UserPool, UserPoolClient } from '../../../prisma/client';

export const toUserPoolDto = (prismaPool: UserPool): UserPoolDto => {
  assert(prismaPool.name);

  return {
    id: brandedId.userPool.dto.parse(prismaPool.id),
    name: prismaPool.name,
    privateKey: prismaPool.privateKey,
    createdTime: prismaPool.createdAt.getTime(),
  };
};

export const toUserPoolClientDto = (prismaPoolClient: UserPoolClient): UserPoolClientDto => {
  assert(prismaPoolClient.name);

  return {
    id: brandedId.userPoolClient.dto.parse(prismaPoolClient.id),
    userPoolId: brandedId.userPool.dto.parse(prismaPoolClient.userPoolId),
    name: prismaPoolClient.name,
    createdTime: prismaPoolClient.createdAt.getTime(),
  };
};
