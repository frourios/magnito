import type { Prisma } from '@prisma/client';
import type { EntityId } from 'schemas/brandedId';
import type { UserDto } from 'schemas/user';
import type { UserEntity } from '../model/userType';
import { userQuery } from './userQuery';

export const userCommand = {
  // oxlint-disable-next-line complexity
  save: async <T extends UserEntity>(
    tx: Prisma.TransactionClient,
    user: T,
  ): Promise<UserDto & { kind: T['kind'] }> => {
    await tx.userAttribute.deleteMany({ where: { userId: user.id } });

    await tx.user.upsert({
      where: { id: user.id },
      update: {
        kind: user.kind,
        email: user.email,
        name: user.name,
        enabled: user.enabled,
        provider: user.provider,
        status: user.status,
        password: user.password,
        salt: user.salt,
        verifier: user.verifier,
        refreshToken: user.refreshToken,
        confirmationCode: user.confirmationCode,
        authorizationCode: user.authorizationCode,
        codeChallenge: user.codeChallenge,
        secretBlock: user.challenge?.secretBlock,
        pubA: user.challenge?.pubA,
        pubB: user.challenge?.pubB,
        secB: user.challenge?.secB,
        srpAuthTimestamp: user.srpAuth?.timestamp,
        srpAuthClientSignature: user.srpAuth?.clientSignature,
        preferredMfaSetting: user.preferredMfaSetting ?? null,
        enabledTotp:
          user.mfaSettingList?.some((setting) => setting === 'SOFTWARE_TOKEN_MFA') ?? null,
        totpSecretCode: user.totpSecretCode,
        attributes: { createMany: { data: user.attributes } },
        updatedAt: new Date(user.updatedTime),
      },
      create: {
        id: user.id,
        kind: user.kind,
        email: user.email,
        name: user.name,
        enabled: user.enabled,
        provider: user.provider,
        status: user.status,
        password: user.password,
        salt: user.salt,
        verifier: user.verifier,
        refreshToken: user.refreshToken,
        confirmationCode: user.confirmationCode,
        authorizationCode: user.authorizationCode,
        codeChallenge: user.codeChallenge,
        userPoolId: user.userPoolId,
        attributes: { createMany: { data: user.attributes } },
        createdAt: new Date(user.createdTime),
        updatedAt: new Date(user.updatedTime),
      },
    });

    return userQuery.findById(tx, user.id);
  },
  delete: async (
    tx: Prisma.TransactionClient,
    deletableUserId: EntityId['deletableUser'],
  ): Promise<void> => {
    await tx.userAttribute.deleteMany({ where: { userId: deletableUserId } });
    await tx.user.delete({ where: { id: deletableUserId } });
  },
};
