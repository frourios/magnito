import { randomBytes } from 'node:crypto';
import type * as Cognito from '@aws-sdk/client-cognito-identity-provider';
import type { Prisma, UserPoolClientSecret } from '../prisma/client';
import { cognitoAssert } from './cognitoAssert';

export const validateCustomClientSecret = (value: string | undefined): void => {
  if (value === undefined) return;
  cognitoAssert(
    typeof value === 'string' && value.length >= 24 && value.length <= 64 && /^[\w+]+$/.test(value),
    'Invalid client secret value.',
  );
};

export const createClientSecret = (
  tx: Prisma.TransactionClient,
  clientId: string,
  customValue?: string,
): Promise<UserPoolClientSecret> => {
  validateCustomClientSecret(customValue);
  const createdAt = new Date();
  return tx.userPoolClientSecret.create({
    data: {
      id: `${clientId}--${createdAt.getTime()}`,
      clientId,
      value: customValue ?? randomBytes(32).toString('hex'),
      createdAt,
    },
  });
};

export const clientSecretDescriptor = (
  secret: { id: string; createdAt: Date },
  value?: string,
): Cognito.ClientSecretDescriptorType => ({
  ClientSecretId: secret.id,
  ClientSecretCreateDate: (secret.createdAt.getTime() / 1000) as unknown as Date,
  ClientSecretValue: value,
});
