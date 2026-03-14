import type { AttributeType } from '@aws-sdk/client-cognito-identity-provider';
import { brandedId } from 'src/schemas/brandedId';
import type { UserAttributeDto, UserDto } from 'src/schemas/user';
import { ulid } from 'ulid';
import { z } from 'zod';
import type { CognitoUserEntity, UserAttributeEntity } from '../model/userType';
import { isEmailVerified } from './isEmailVerified';

export const COMPUTED_ATTRIBUTE_NAMES = [
  'sub',
  'name',
  'email',
  'email_verified',
  'identities',
  'updated_at',
] as const;

export const STANDARD_ATTRIBUTE_NAMES = [
  'address',
  'birthdate',
  'family_name',
  'gender',
  'given_name',
  'locale',
  'middle_name',
  'name',
  'nickname',
  'phone_number',
  'picture',
  'preferred_username',
  'profile',
  'website',
  'zoneinfo',
] as const;

export const toAttributeTypes = (user: UserDto | CognitoUserEntity): AttributeType[] => {
  return [
    { Name: 'sub', Value: user.id },
    { Name: 'email', Value: user.email },
    { Name: 'updated_at', Value: Math.floor(user.updatedTime / 1000).toString() },
    ...user.attributes.map((attr) => ({ Name: attr.name, Value: attr.value })),
    ...(user.kind === 'cognito'
      ? [{ Name: 'email_verified', Value: isEmailVerified(user) ? 'true' : 'false' }]
      : [
          { Name: 'email_verified', Value: 'false' },
          { Name: 'name', Value: user.name },
          {
            Name: 'identities',
            Value: JSON.stringify([
              {
                dateCreated: user.createdTime,
                userId: user.id,
                providerName: user.provider,
                providerType: user.provider,
                issuer: null,
                primary: 'true',
              },
            ]),
          },
        ]),
  ];
};

export const createAttributes = (
  attributes: AttributeType[],
  exists: UserAttributeDto[],
): UserAttributeEntity[] => [
  ...exists
    .filter((entity) => attributes.every((attr) => attr.Name !== entity.name))
    .map((entity) => ({ ...entity, id: brandedId.userAttribute.entity.parse(entity.id) })),
  ...attributes
    .filter((attr) => COMPUTED_ATTRIBUTE_NAMES.every((name) => name !== attr.Name))
    .map((attr) => ({
      id: brandedId.userAttribute.entity.parse(
        exists.find((entity) => entity.name === attr.Name)?.id ?? ulid(),
      ),
      name: z.enum(STANDARD_ATTRIBUTE_NAMES).or(z.string().startsWith('custom:')).parse(attr.Name),
      value: z.string().parse(attr.Value),
    })),
];
