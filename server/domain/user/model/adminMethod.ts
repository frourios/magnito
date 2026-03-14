import assert from 'assert';
import type { AttributeType } from '@aws-sdk/client-cognito-identity-provider';
import type { AdminCreateUserTarget, AdminSetUserPasswordTarget } from 'src/schemas/auth';
import { brandedId, type DtoId, type EntityId } from 'src/schemas/brandedId';
import type { CognitoUserDto, UserDto } from 'src/schemas/user';
import { ulid } from 'ulid';
import { createAttributes } from '../service/createAttributes';
import { findEmail } from '../service/findEmail';
import { genCredentials } from '../service/genCredentials';
import { validatePass } from '../service/validatePass';
import { cognitoUserMethod } from './cognitoUserMethod';
import type { CognitoUserEntity } from './userType';

export const adminMethod = {
  createVerifiedUser: (
    idCount: number,
    req: AdminCreateUserTarget['reqBody'],
    userPoolId: DtoId['userPool'],
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
  deleteUser: (user: UserDto, userPoolId: string): EntityId['deletableUser'] => {
    assert(user.userPoolId === userPoolId);

    return brandedId.deletableUser.entity.parse(user.id);
  },
  setUserPassword: (
    user: CognitoUserDto,
    req: AdminSetUserPasswordTarget['reqBody'],
  ): CognitoUserEntity => {
    assert(req.UserPoolId);
    assert(req.Password);
    validatePass(req.Password);

    return {
      ...user,
      id: brandedId.cognitoUser.entity.parse(user.id),
      /* v8 ignore next 4 */
      attributes: user.attributes.map((attr) => ({
        ...attr,
        id: brandedId.userAttribute.entity.parse(attr.id),
      })),
      userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
      ...genCredentials({ poolId: user.userPoolId, username: user.name, password: req.Password }),
      status: req.Permanent ? 'CONFIRMED' : 'FORCE_CHANGE_PASSWORD',
      password: req.Password,
      refreshToken: ulid(),
      challenge: undefined,
      updatedTime: Date.now(),
    };
  },
  updateAttributes: (
    user: CognitoUserDto,
    attributes: AttributeType[] | undefined,
  ): CognitoUserEntity => {
    assert(attributes);
    const email = attributes.find((attr) => attr.Name === 'email')?.Value ?? user.email;

    return {
      ...user,
      id: brandedId.cognitoUser.entity.parse(user.id),
      userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
      attributes: createAttributes(attributes, user.attributes),
      email,
      updatedTime: Date.now(),
    };
  },
};
