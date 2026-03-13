import type { Prisma } from '@prisma/client';
import type { DtoId, MaybeId } from 'schemas/brandedId';
import { brandedId } from 'schemas/brandedId';
import type { JwksDto, UserPoolClientDto, UserPoolDto } from 'schemas/userPool';
import { genJwks } from 'server/service/privateKey';
import { toUserPoolClientDto, toUserPoolDto } from './userPoolDto';

export const userPoolQuery = {
  listAll: (tx: Prisma.TransactionClient, limit?: number): Promise<UserPoolDto[]> =>
    tx.userPool
      .findMany({ take: limit, orderBy: { createdAt: 'asc' } })
      .then((pools) => pools.map(toUserPoolDto)),
  listClientAll: (
    tx: Prisma.TransactionClient,
    userPoolId: string,
    limit?: number,
  ): Promise<UserPoolClientDto[]> =>
    tx.userPoolClient
      .findMany({ where: { userPoolId }, take: limit, orderBy: { createdAt: 'asc' } })
      .then((clients) => clients.map(toUserPoolClientDto)),
  findById: (tx: Prisma.TransactionClient, userPoolId: string): Promise<UserPoolDto> =>
    tx.userPool.findUniqueOrThrow({ where: { id: userPoolId } }).then(toUserPoolDto),
  findJwks: (tx: Prisma.TransactionClient, userPoolId: string): Promise<JwksDto> =>
    userPoolQuery.findById(tx, userPoolId).then((pool) => genJwks(pool.privateKey)),
  findClientById: (
    tx: Prisma.TransactionClient,
    poolClientId: string,
  ): Promise<UserPoolClientDto> =>
    tx.userPoolClient.findUniqueOrThrow({ where: { id: poolClientId } }).then(toUserPoolClientDto),
  findJwksInfo: (
    tx: Prisma.TransactionClient,
    userId: MaybeId['cognitoUser'] | MaybeId['socialUser'],
  ): Promise<{
    userPoolId: DtoId['userPool'];
    poolClientIds: DtoId['userPoolClient'][];
  }> =>
    tx.userPool
      .findFirstOrThrow({
        where: { users: { some: { id: userId } } },
        include: { userPoolClients: true },
      })
      .then((pool) => ({
        userPoolId: brandedId.userPool.dto.parse(pool.id),
        poolClientIds: pool.userPoolClients.map((client) =>
          brandedId.userPoolClient.dto.parse(client.id),
        ),
      })),
};
