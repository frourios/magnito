import assert from 'assert';
import type { AttributeType } from '@aws-sdk/client-cognito-identity-provider';
import type { AdminCreateUserTarget, AdminSetUserPasswordTarget } from 'common/types/auth';
import type { EntityId } from 'common/types/brandedId';
import type { CognitoUserEntity, UserEntity } from 'common/types/user';
import { brandedId } from 'service/brandedId';
import { ulid } from 'ulid';
import { createAttributes } from '../service/createAttributes';
import { findEmail } from '../service/findEmail';
import { genCredentials } from '../service/genCredentials';
import { validatePass } from '../service/validatePass';
import { cognitoUserMethod } from './cognitoUserMethod';

export const adminMethod = {
  createVerifiedUser: (
    idCount: number,
    req: AdminCreateUserTarget['reqBody'],
    userPoolId: EntityId['userPool'],
  ): CognitoUserEntity => {
    assert(req.Username);

    const password = req.TemporaryPassword ?? `TempPass-${Date.now()}`;
    const email = findEmail(req.UserAttributes);

    return {
      ...cognitoUserMethod.create(idCount, {
        name: req.Username,
        password,
        email,
        userPoolId,
        attributes: req.UserAttributes,
      }),
      status: 'FORCE_CHANGE_PASSWORD',
    };
  },
  deleteUser: (user: UserEntity, userPoolId: string): EntityId['deletableUser'] => {
    assert(user.userPoolId === userPoolId);

    return brandedId.deletableUser.entity.parse(user.id);
  },
  setUserPassword: (
    user: CognitoUserEntity,
    req: AdminSetUserPasswordTarget['reqBody'],
  ): CognitoUserEntity => {
    assert(req.UserPoolId);
    assert(req.Password);
    validatePass(req.Password);

    return {
      ...user,
      ...genCredentials({ poolId: user.userPoolId, username: user.name, password: req.Password }),
      status: req.Permanent ? 'CONFIRMED' : 'FORCE_CHANGE_PASSWORD',
      password: req.Password,
      refreshToken: ulid(),
      challenge: undefined,
      updatedTime: Date.now(),
    };
  },
  updateAttributes: (
    user: CognitoUserEntity,
    attributes: AttributeType[] | undefined,
  ): CognitoUserEntity => {
    assert(attributes);
    const email = attributes.find((attr) => attr.Name === 'email')?.Value ?? user.email;

    return {
      ...user,
      attributes: createAttributes(attributes, user.attributes),
      email,
      updatedTime: Date.now(),
    };
  },
};
