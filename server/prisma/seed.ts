import assert from 'assert';
import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import { USER_KINDS } from 'common/constants';
import { prismaClient, transaction } from 'service/prismaClient';
import { ulid } from 'ulid';

const migrateUser = async (tx: Prisma.TransactionClient): Promise<void> => {
  const users = await tx.user.findMany({ where: { kind: null } });

  if (users.length > 0) {
    await Promise.all(
      users.map(({ id, ...user }) =>
        tx.user.update({ where: { id }, data: { ...user, kind: USER_KINDS.cognito } }),
      ),
    );
  }

  const socials = await tx.user.findMany({
    where: { kind: USER_KINDS.social, authorizationCode: null },
  });

  if (socials.length > 0) {
    await Promise.all(
      socials.map(({ id, ...s }) =>
        tx.user.update({
          where: { id },
          data: {
            ...s,
            authorizationCode: ulid(),
            codeChallenge: createHash('sha256').update(ulid()).digest('base64url'),
          },
        }),
      ),
    );
  }

  const test = async (): Promise<void> => {
    const users = await tx.user.findMany();

    users.forEach((user) => {
      assert(user.kind !== null);
      assert(
        user.kind === USER_KINDS.cognito ||
          (user.authorizationCode !== null && user.codeChallenge !== null),
      );
    });
  };

  await test();
};

const migrateUserPool = async (tx: Prisma.TransactionClient): Promise<void> => {
  const pools = await tx.userPool.findMany({ where: { name: null } });

  await tx.userPool.updateMany({
    where: { id: { in: pools.map((p) => p.id) } },
    data: { name: 'defaultPool' },
  });

  const poolClients = await tx.userPoolClient.findMany({ where: { name: null } });

  await tx.userPoolClient.updateMany({
    where: { id: { in: poolClients.map((p) => p.id) } },
    data: { name: 'defaultPoolClient' },
  });

  const test = async (): Promise<void> => {
    const pools = await tx.userPool.findMany();

    pools.forEach((pool) => assert(pool.name !== null));

    const poolClients = await tx.userPoolClient.findMany();

    poolClients.forEach((client) => assert(client.name !== null));
  };

  await test();
};

transaction((tx) => Promise.all([migrateUser(tx), migrateUserPool(tx)]))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
