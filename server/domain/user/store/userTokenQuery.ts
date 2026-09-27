import type { UserDto } from '../../../../src/schemas/user';
import type { Prisma } from '../../../prisma/client';
import { cognitoAssert } from '../../../service/cognitoAssert';
import { toUserDto, USER_INCLUDE } from './userDto';

export const userTokenQuery = {
  findUserByRefreshToken: async (
    tx: Prisma.TransactionClient,
    refreshToken: string,
  ): Promise<UserDto> => {
    const token = await tx.userToken.findFirstOrThrow({
      where: { token: refreshToken, kind: 'refresh', revoked: false },
      include: { user: { include: USER_INCLUDE } },
    });

    return toUserDto(token.user);
  },
  validatePasswordMfaSession: async (
    tx: Prisma.TransactionClient,
    userId: string,
    clientId: string,
    session: string,
  ): Promise<void> => {
    const token = await tx.userToken.findFirst({
      where: {
        userId,
        kind: 'password_mfa',
        token: `${clientId}:${session}`,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    cognitoAssert(token, 'Invalid verification code provided, please try again.');
  },
  validateAccessToken: async (tx: Prisma.TransactionClient, accessToken: string): Promise<void> => {
    const token = await tx.userToken.findFirst({
      where: { token: accessToken, kind: 'access' },
    });

    cognitoAssert(!token?.revoked, 'Access Token has been revoked');
    cognitoAssert(!token || token.expiresAt > new Date(), 'Access Token has expired');
  },
};
