import type { Prisma } from 'server/prisma/client';
import { cognitoAssert } from 'server/service/cognitoAssert';
import type { UserDto } from 'src/schemas/user';
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
  validateAccessToken: async (tx: Prisma.TransactionClient, accessToken: string): Promise<void> => {
    const token = await tx.userToken.findFirst({
      where: { token: accessToken, kind: 'access' },
    });

    cognitoAssert(!token?.revoked, 'Access Token has been revoked');
    cognitoAssert(!token || token.expiresAt > new Date(), 'Access Token has expired');
  },
};
