import { UserStatusType } from '@aws-sdk/client-cognito-identity-provider';
import type { Prisma, User } from '@prisma/client';
import { MFA_SETTING_LIST, PROVIDER_LIST, USER_KIND_LIST, USER_KINDS } from 'common/constants';
import { brandedId } from 'schemas/brandedId';
import type { CognitoUserDto, SocialUserDto, UserAttributeDto, UserDto } from 'schemas/user';
import { z } from 'zod';

const getChallenge = (prismaUser: User): CognitoUserDto['challenge'] =>
  prismaUser.secretBlock && prismaUser.pubA && prismaUser.pubB && prismaUser.secB
    ? {
        secretBlock: prismaUser.secretBlock,
        pubA: prismaUser.pubA,
        pubB: prismaUser.pubB,
        secB: prismaUser.secB,
      }
    : undefined;

export const USER_INCLUDE = { attributes: true } as const;

type PrismaUser = Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>;

export const toCognitoUserDto = (prismaUser: PrismaUser): CognitoUserDto => {
  return {
    id: brandedId.cognitoUser.dto.parse(prismaUser.id),
    kind: z.literal(USER_KINDS.cognito).parse(prismaUser.kind),
    name: prismaUser.name,
    enabled: prismaUser.enabled,
    status: z
      .enum([
        UserStatusType.UNCONFIRMED,
        UserStatusType.CONFIRMED,
        UserStatusType.FORCE_CHANGE_PASSWORD,
        UserStatusType.RESET_REQUIRED,
      ])
      .parse(prismaUser.status),
    email: prismaUser.email,
    password: z.string().parse(prismaUser.password),
    salt: z.string().parse(prismaUser.salt),
    verifier: z.string().parse(prismaUser.verifier),
    refreshToken: prismaUser.refreshToken,
    confirmationCode: z.string().parse(prismaUser.confirmationCode),
    challenge: getChallenge(prismaUser),
    userPoolId: brandedId.userPool.dto.parse(prismaUser.userPoolId),
    attributes: prismaUser.attributes.map(
      (attr): UserAttributeDto => ({
        id: brandedId.userAttribute.dto.parse(attr.id),
        name: attr.name,
        value: attr.value,
      }),
    ),
    srpAuth: z
      .object({ timestamp: z.string(), clientSignature: z.string() })
      .optional()
      .parse(
        prismaUser.srpAuthTimestamp
          ? {
              timestamp: prismaUser.srpAuthTimestamp,
              clientSignature: prismaUser.srpAuthClientSignature,
            }
          : undefined,
      ),
    preferredMfaSetting: z
      .enum(MFA_SETTING_LIST)
      .optional()
      .parse(prismaUser.preferredMfaSetting ?? undefined),
    mfaSettingList: prismaUser.enabledTotp ? ['SOFTWARE_TOKEN_MFA'] : undefined,
    totpSecretCode: prismaUser.totpSecretCode ?? undefined,
    createdTime: prismaUser.createdAt.getTime(),
    updatedTime: prismaUser.updatedAt.getTime(),
  };
};

export const toSocialUserDto = (prismaUser: PrismaUser): SocialUserDto => {
  return {
    id: brandedId.socialUser.dto.parse(prismaUser.id),
    kind: z.literal(USER_KINDS.social).parse(prismaUser.kind),
    name: prismaUser.name,
    enabled: prismaUser.enabled,
    status: z.literal(UserStatusType.EXTERNAL_PROVIDER).parse(prismaUser.status),
    email: prismaUser.email,
    provider: z.enum(PROVIDER_LIST).parse(prismaUser.provider),
    authorizationCode: z.string().parse(prismaUser.authorizationCode),
    codeChallenge: z.string().parse(prismaUser.codeChallenge),
    refreshToken: prismaUser.refreshToken,
    userPoolId: brandedId.userPool.dto.parse(prismaUser.userPoolId),
    attributes: prismaUser.attributes.map(
      (attr): UserAttributeDto => ({
        id: brandedId.userAttribute.dto.parse(attr.id),
        name: attr.name,
        value: attr.value,
      }),
    ),
    createdTime: prismaUser.createdAt.getTime(),
    updatedTime: prismaUser.updatedAt.getTime(),
  };
};

export const toUserDto = (prismaUser: PrismaUser): UserDto => {
  const kind = z.enum(USER_KIND_LIST).parse(prismaUser.kind);

  switch (kind) {
    case 'cognito':
      return toCognitoUserDto(prismaUser);
    case 'social':
      return toSocialUserDto(prismaUser);
    /* v8 ignore next 2 */
    default:
      throw new Error(kind satisfies never);
  }
};
