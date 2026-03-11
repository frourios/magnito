import assert from 'assert';
import type { AttributeType } from '@aws-sdk/client-cognito-identity-provider';
import type { EntityId } from 'schemas/brandedId';
import { brandedId } from 'schemas/brandedId';
import type { UserDto } from 'schemas/user';
import { createAttributes } from '../service/createAttributes';
import { genConfirmationCode } from '../service/genConfirmationCode';
import type { UserEntity } from './userType';

export const userMethod = {
  // oxlint-disable-next-line complexity
  updateAttributes: (user: UserDto, attributes: AttributeType[] | undefined): UserEntity => {
    assert(attributes);

    if (user.kind === 'cognito') {
      const email = attributes.find((attr) => attr.Name === 'email')?.Value ?? user.email;
      const verified = user.email === email;

      return {
        ...user,
        id: brandedId.cognitoUser.entity.parse(user.id),
        attributes: createAttributes(attributes, user.attributes),
        userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
        status: verified ? user.status : 'UNCONFIRMED',
        confirmationCode: verified ? user.confirmationCode : genConfirmationCode(),
        email,
        updatedTime: Date.now(),
      };
    }

    return {
      ...user,
      id: brandedId.socialUser.entity.parse(user.id),
      attributes: createAttributes(attributes, user.attributes),
      userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
      updatedTime: Date.now(),
    };
  },
  deleteAttributes: (user: UserDto, attributeNames: string[] | undefined): UserEntity => {
    assert(attributeNames);

    const attributes = user.attributes
      .filter((attr) => !attributeNames.includes(attr.name))
      .map((attr) => ({ ...attr, id: brandedId.userAttribute.entity.parse(attr.id) }));

    return user.kind === 'cognito'
      ? {
          ...user,
          id: brandedId.cognitoUser.entity.parse(user.id),
          userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
          attributes,
          updatedTime: Date.now(),
        }
      : {
          ...user,
          id: brandedId.socialUser.entity.parse(user.id),
          userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
          attributes,
          updatedTime: Date.now(),
        };
  },
  delete: (user: UserDto): EntityId['deletableUser'] => {
    return brandedId.deletableUser.entity.parse(user.id);
  },
};
