import type { Prisma } from 'server/prisma/client';
import { EXPIRES_SEC, REFRESH_TOKEN_EXPIRES_SEC, type TokenKind } from 'server/service/constants';
import type { EntityId } from 'src/schemas/brandedId';
import { brandedId } from 'src/schemas/brandedId';
import { ulid } from 'ulid';

export const userTokenCommand = {
  create: async (
    tx: Prisma.TransactionClient,
    userId: string,
    kind: TokenKind,
    token: string,
  ): Promise<void> => {
    const now = new Date();
    const expiresSec = kind === 'refresh' ? REFRESH_TOKEN_EXPIRES_SEC : EXPIRES_SEC;
    const expiresAt = new Date(now.getTime() + expiresSec * 1000);

    await tx.userToken.create({
      data: {
        id: brandedId.userToken.entity.parse(ulid()),
        kind,
        token,
        createdAt: now,
        expiresAt,
        revoked: false,
        userId,
      },
    });
  },
  createTokens: async (
    tx: Prisma.TransactionClient,
    userId: string,
    tokens: { AccessToken: string; IdToken: string; RefreshToken: string },
  ): Promise<void> => {
    await Promise.all([
      userTokenCommand.create(tx, userId, 'access', tokens.AccessToken),
      userTokenCommand.create(tx, userId, 'id', tokens.IdToken),
      userTokenCommand.create(tx, userId, 'refresh', tokens.RefreshToken),
    ]);
  },
  revokeByToken: async (tx: Prisma.TransactionClient, token: string): Promise<void> => {
    const userToken = await tx.userToken.findFirstOrThrow({
      where: { token, revoked: false },
    });

    await tx.userToken.update({
      where: { id: userToken.id },
      data: { revoked: true, revokedAt: new Date() },
    });
  },
  revokeAllByUserId: async (tx: Prisma.TransactionClient, userId: string): Promise<void> => {
    await tx.userToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  },
  deleteByUserId: async (
    tx: Prisma.TransactionClient,
    userId: EntityId['deletableUser'],
  ): Promise<void> => {
    await tx.userToken.deleteMany({ where: { userId } });
  },
};
