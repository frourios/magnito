import assert from 'assert';
import { createHash } from 'crypto';
import type { DtoId } from 'schemas/brandedId';
import { brandedId } from 'schemas/brandedId';
import type {
  SocialUserCreateVal,
  SocialUserDto,
  SocialUserResponseTokensVal,
  UserDto,
} from 'schemas/user';
import type { JwksDto, UserPoolClientDto, UserPoolDto } from 'schemas/userPool';
import { cognitoAssert } from 'server/service/cognitoAssert';
import { ulid } from 'ulid';
import { z } from 'zod';
import { createAttributes } from '../service/createAttributes';
import { genTokens } from '../service/genTokens';
import type { SocialUserEntity } from './userType';

export const socialUserMethod = {
  create: (userPoolId: DtoId['userPool'], val: SocialUserCreateVal): SocialUserEntity => {
    cognitoAssert(
      /^[a-z][a-z\d_-]/.test(val.name),
      "1 validation error detected: Value at 'username' failed to satisfy constraint: Member must satisfy regular expression pattern: [\\p{L}\\p{M}\\p{S}\\p{N}\\p{P}]+",
    );
    cognitoAssert(z.string().email().parse(val.email), 'Invalid email address format.');
    assert(z.string().url().optional().safeParse(val.photoUrl).success, 'Invalid photoUrl format.');

    const now = Date.now();

    return {
      id: brandedId.socialUser.entity.parse(ulid()),
      kind: 'social',
      email: val.email,
      provider: val.provider,
      codeChallenge: val.codeChallenge,
      authorizationCode: ulid(),
      enabled: true,
      status: 'EXTERNAL_PROVIDER',
      name: val.name,
      refreshToken: ulid(),
      userPoolId: brandedId.userPool.entity.parse(userPoolId),
      attributes: val.photoUrl
        ? createAttributes([{ Name: 'picture', Value: val.photoUrl }], [])
        : [],
      createdTime: now,
      updatedTime: now,
    };
  },
  createToken: (
    user: SocialUserDto,
    codeVerifier: string,
    pool: UserPoolDto,
    poolClient: UserPoolClientDto,
    jwks: JwksDto,
  ): SocialUserResponseTokensVal => {
    const tokens = genTokens({
      privateKey: pool.privateKey,
      userPoolClientId: poolClient.id,
      jwks,
      user,
    });

    assert(user.codeChallenge === createHash('sha256').update(codeVerifier).digest('base64url'));

    return {
      id_token: tokens.IdToken,
      access_token: tokens.AccessToken,
      refresh_token: user.refreshToken,
      expires_in: 3600,
      token_type: 'Bearer',
    };
  },
  updateCodeChallenge: (user: UserDto, codeChallenge: string): SocialUserEntity => {
    assert(user.kind === 'social');

    return {
      ...user,
      id: brandedId.socialUser.entity.parse(user.id),
      userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
      attributes: user.attributes.map((attr) => ({
        ...attr,
        id: brandedId.userAttribute.entity.parse(attr.id),
      })),
      codeChallenge,
    };
  },
};
