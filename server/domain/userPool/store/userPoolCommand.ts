import type { Prisma } from '@prisma/client';
import type { EntityId } from 'src/schemas/brandedId';
import type { UserPoolClientEntity, UserPoolEntity } from '../model/userPoolType';

export const userPoolCommand = {
  save: async (tx: Prisma.TransactionClient, pool: UserPoolEntity): Promise<void> => {
    await tx.userPool.upsert({
      where: { id: pool.id },
      update: { name: pool.name, privateKey: pool.privateKey },
      create: {
        id: pool.id,
        name: pool.name,
        privateKey: pool.privateKey,
        createdAt: new Date(pool.createdTime),
      },
    });
  },
  saveClient: async (
    tx: Prisma.TransactionClient,
    poolClient: UserPoolClientEntity,
  ): Promise<void> => {
    await tx.userPoolClient.upsert({
      where: { id: poolClient.id },
      update: { name: poolClient.name },
      create: {
        id: poolClient.id,
        userPoolId: poolClient.userPoolId,
        name: poolClient.name,
        createdAt: new Date(poolClient.createdTime),
      },
    });
  },
  delete: async (
    tx: Prisma.TransactionClient,
    userPoolId: EntityId['deletableUserPool'],
  ): Promise<void> => {
    await tx.userAttribute.deleteMany({ where: { User: { userPoolId } } });
    await tx.user.deleteMany({ where: { userPoolId } });
    await tx.userPoolClient.deleteMany({ where: { userPoolId } });
    await tx.userPool.delete({ where: { id: userPoolId } });
  },
  deleteClient: async (
    tx: Prisma.TransactionClient,
    poolClientId: EntityId['deletableUserPoolClient'],
  ): Promise<void> => {
    await tx.userPoolClient.delete({ where: { id: poolClientId } });
  },
};
