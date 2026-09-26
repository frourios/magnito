import { setTimeout } from 'timers/promises';
import { Prisma } from '../prisma/client';
import { prismaClient } from './prismaClient';

export function transaction<U>(
  isolationLevel: 'RepeatableRead' | 'Serializable',
  fn: (tx: Prisma.TransactionClient) => Promise<U>,
  retry = 3,
): Promise<U> {
  return prismaClient.$transaction<U>(fn, { isolationLevel }).catch(async (e) => {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2028', 'P2034'].includes(e.code) &&
      retry > 0
    ) {
      await setTimeout(100);

      return transaction(isolationLevel, fn, retry - 1);
    }

    throw e;
  });
}
