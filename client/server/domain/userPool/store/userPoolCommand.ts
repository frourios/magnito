import type { Prisma } from '@prisma/client';
import type { UserPoolClientDto, UserPoolDto } from 'schemas/userPool';
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
  delete: async (tx: Prisma.TransactionClient, pool: UserPoolDto): Promise<void> => {
    await tx.userAttribute.deleteMany({ where: { User: { userPoolId: pool.id } } });
    await tx.user.deleteMany({ where: { userPoolId: pool.id } });
    await tx.userPoolClient.deleteMany({ where: { userPoolId: pool.id } });
    await tx.userPool.delete({ where: { id: pool.id } });
  },
  deleteClient: async (
    tx: Prisma.TransactionClient,
    poolClient: UserPoolClientDto,
  ): Promise<void> => {
    await tx.userPoolClient.delete({ where: { id: poolClient.id } });
  },
};
