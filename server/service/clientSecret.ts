import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Prisma } from '../prisma/client';
import { cognitoAssert } from './cognitoAssert';

const equalSecret = (actual: string | undefined, expected: string): boolean => {
  if (!actual) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const clientSecretHash = (username: string, clientId: string, secret: string): string =>
  createHmac('sha256', secret)
    .update(username + clientId)
    .digest('base64');

export const assertClientSecretHash = async (
  tx: Prisma.TransactionClient,
  clientId: string,
  username: string,
  providedHash: string | undefined,
): Promise<void> => {
  const secrets = await tx.userPoolClientSecret.findMany({ where: { clientId } });
  if (secrets.length === 0) return;

  cognitoAssert(providedHash, 'Client secret hash was not received.');
  cognitoAssert(
    secrets.some((secret) =>
      equalSecret(providedHash, clientSecretHash(username, clientId, secret.value)),
    ),
    'Unable to verify client secret hash.',
  );
};

export const assertClientSecret = async (
  tx: Prisma.TransactionClient,
  clientId: string,
  providedSecret: string | undefined,
): Promise<void> => {
  const secrets = await tx.userPoolClientSecret.findMany({ where: { clientId } });
  if (secrets.length === 0) return;

  cognitoAssert(
    secrets.some((secret) => equalSecret(providedSecret, secret.value)),
    'Invalid client secret.',
  );
};
