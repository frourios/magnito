import assert from 'assert';
import type { UserPool, UserPoolClient } from '@prisma/client';
import type { UserPoolClientEntity, UserPoolEntity } from 'common/types/userPool';
import { brandedId } from 'service/brandedId';

export const toUserPoolEntity = (prismaPool: UserPool): UserPoolEntity => {
  assert(prismaPool.name);

  return {
    id: brandedId.userPool.entity.parse(prismaPool.id),
    name: prismaPool.name,
    privateKey: prismaPool.privateKey,
    createdTime: prismaPool.createdAt.getTime(),
  };
};

export const toUserPoolClientEntity = (prismaPoolClient: UserPoolClient): UserPoolClientEntity => {
  assert(prismaPoolClient.name);

  return {
    id: brandedId.userPoolClient.entity.parse(prismaPoolClient.id),
    userPoolId: brandedId.userPool.entity.parse(prismaPoolClient.userPoolId),
    name: prismaPoolClient.name,
    createdTime: prismaPoolClient.createdAt.getTime(),
  };
};
