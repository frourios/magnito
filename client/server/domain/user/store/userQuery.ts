import type { Prisma } from '@prisma/client';
import { USER_KINDS } from 'common/constants';
import type { MaybeId } from 'schemas/brandedId';
import type { SocialUserDto, UserDto } from 'schemas/user';
import type { UserEntity } from '../model/userType';
import { toSocialUserDto, toUserDto, USER_INCLUDE } from './userDto';

export const userQuery = {
  countId: (tx: Prisma.TransactionClient, id: string): Promise<number> =>
    tx.user.count({ where: { id } }),
  listSocials: (
    tx: Prisma.TransactionClient,
    userPoolClientId: MaybeId['userPoolClient'],
  ): Promise<SocialUserDto[]> =>
    tx.user
      .findMany({
        where: {
          UserPool: { userPoolClients: { some: { id: userPoolClientId } } },
          kind: USER_KINDS.social,
        },
        include: USER_INCLUDE,
        orderBy: { createdAt: 'asc' },
      })
      .then((users) => users.map(toSocialUserDto)),
  listAll: (tx: Prisma.TransactionClient, userPoolId: string, limit?: number): Promise<UserDto[]> =>
    tx.user
      .findMany({
        where: { userPoolId },
        include: USER_INCLUDE,
        take: limit,
        orderBy: { createdAt: 'asc' },
      })
      .then((users) => users.map(toUserDto)),
  findById: (
    tx: Prisma.TransactionClient,
    id: UserDto['id'] | UserEntity['id'] | MaybeId['socialUser'],
  ): Promise<UserDto> =>
    tx.user.findUniqueOrThrow({ where: { id }, include: USER_INCLUDE }).then(toUserDto),
  findByName: (tx: Prisma.TransactionClient, name: string): Promise<UserDto> =>
    tx.user.findFirstOrThrow({ where: { name }, include: USER_INCLUDE }).then(toUserDto),
  findByRefreshToken: (tx: Prisma.TransactionClient, refreshToken: string): Promise<UserDto> =>
    tx.user.findFirstOrThrow({ where: { refreshToken }, include: USER_INCLUDE }).then(toUserDto),
  findByAuthorizationCode: (
    tx: Prisma.TransactionClient,
    authorizationCode: string,
  ): Promise<SocialUserDto> =>
    tx.user
      .findFirstOrThrow({ where: { authorizationCode }, include: USER_INCLUDE })
      .then(toSocialUserDto),
};
