import type { EntityId } from '../../../../src/schemas/brandedId';
import type { UserDto } from '../../../../src/schemas/user';
import type { Prisma } from '../../../prisma/client';
import { cognitoAssert } from '../../../service/cognitoAssert';
import type { UserEntity } from '../model/userType';
import { hashPasswordForHistory, matchesPasswordHistory } from '../service/passwordHistory';
import { userQuery } from './userQuery';

const latestHistory = (history: string[], count: number): string[] =>
  count ? history.slice(-count) : [];

export const userCommand = {
  // oxlint-disable-next-line complexity
  save: async <T extends UserEntity>(
    tx: Prisma.TransactionClient,
    user: T,
  ): Promise<UserDto & { kind: T['kind'] }> => {
    const current = await tx.user.findUnique({ where: { id: user.id } });
    let passwordHistory = current?.passwordHistory ?? [];
    let temporaryPasswordExpiresAt = current?.temporaryPasswordExpiresAt ?? null;

    if (user.kind === 'cognito') {
      const policy = await tx.userPool.findUniqueOrThrow({ where: { id: user.userPoolId } });
      const passwordChanged = current?.password !== user.password;
      passwordHistory = latestHistory(
        passwordHistory,
        current?.status === 'FORCE_CHANGE_PASSWORD'
          ? policy.passwordHistorySize
          : Math.max(policy.passwordHistorySize - 1, 0),
      );
      if (passwordChanged && current && policy.passwordHistorySize) {
        cognitoAssert(
          (current.status === 'FORCE_CHANGE_PASSWORD' || current.password !== user.password) &&
            !passwordHistory.some((entry) => matchesPasswordHistory(user.password, entry)),
          'Password cannot be reused.',
        );
      }
      if (
        passwordChanged &&
        current?.password &&
        current.status !== 'FORCE_CHANGE_PASSWORD' &&
        policy.passwordHistorySize
      ) {
        passwordHistory = [...passwordHistory, hashPasswordForHistory(current.password)];
      }
      passwordHistory = latestHistory(
        passwordHistory,
        user.status === 'FORCE_CHANGE_PASSWORD'
          ? policy.passwordHistorySize
          : Math.max(policy.passwordHistorySize - 1, 0),
      );
      if (user.status === 'FORCE_CHANGE_PASSWORD' && passwordChanged) {
        temporaryPasswordExpiresAt = new Date(
          Date.now() + policy.temporaryPasswordValidityDays * 24 * 60 * 60 * 1000,
        );
      } else if (user.status === 'CONFIRMED') {
        temporaryPasswordExpiresAt = null;
      }
    }

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
        passwordHistory,
        temporaryPasswordExpiresAt,
        salt: user.salt,
        verifier: user.verifier,

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
        passwordHistory,
        temporaryPasswordExpiresAt,
        salt: user.salt,
        verifier: user.verifier,

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
