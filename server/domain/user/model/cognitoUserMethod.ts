import assert from 'assert';
import type { AttributeType } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoAssert } from 'server/service/cognitoAssert';
import type { ChangePasswordTarget, VerifyUserAttributeTarget } from 'src/schemas/auth';
import type { DtoId } from 'src/schemas/brandedId';
import { brandedId } from 'src/schemas/brandedId';
import type { CognitoUserDto, UserDto } from 'src/schemas/user';
import { ulid } from 'ulid';
import { z } from 'zod';
import { createAttributes } from '../service/createAttributes';
import { genConfirmationCode } from '../service/genConfirmationCode';
import { genCredentials } from '../service/genCredentials';
import { validatePass } from '../service/validatePass';
import type { CognitoUserEntity } from './userType';

export const cognitoUserMethod = {
  create: (
    idCount: number,
    params: {
      name: string;
      password: string;
      email: string;
      userPoolId: DtoId['userPool'];
      attributes: AttributeType[] | undefined;
    },
  ): CognitoUserEntity => {
    assert(params.attributes);
    cognitoAssert(idCount === 0, 'User already exists');
    cognitoAssert(
      /^[a-z][a-z\d_-]/.test(params.name),
      "1 validation error detected: Value at 'username' failed to satisfy constraint: Member must satisfy regular expression pattern: [\\p{L}\\p{M}\\p{S}\\p{N}\\p{P}]+",
    );
    validatePass(params.password);
    cognitoAssert(z.string().email().parse(params.email), 'Invalid email address format.');

    const now = Date.now();

    return {
      ...genCredentials({
        poolId: params.userPoolId,
        username: params.name,
        password: params.password,
      }),
      id: brandedId.cognitoUser.entity.parse(ulid()),
      kind: 'cognito',
      email: params.email,
      enabled: true,
      status: 'UNCONFIRMED',
      name: params.name,
      password: params.password,
      refreshToken: ulid(),
      userPoolId: brandedId.userPool.entity.parse(params.userPoolId),
      confirmationCode: genConfirmationCode(),
      attributes: createAttributes(params.attributes, []),
      createdTime: now,
      updatedTime: now,
    };
  },
  confirm: (user: CognitoUserDto, confirmationCode: string): CognitoUserEntity => {
    cognitoAssert(
      user.confirmationCode === confirmationCode,
      'Invalid verification code provided, please try again.',
    );

    return {
      ...user,
      id: brandedId.cognitoUser.entity.parse(user.id),
      attributes: user.attributes.map((attr) => ({
        ...attr,
        id: brandedId.userAttribute.entity.parse(attr.id),
      })),
      userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
      status: 'CONFIRMED',
      updatedTime: Date.now(),
    };
  },
  changePassword: (params: {
    user: CognitoUserDto;
    req: ChangePasswordTarget['reqBody'];
  }): CognitoUserEntity => {
    cognitoAssert(
      params.user.password === params.req.PreviousPassword,
      'Incorrect username or password.',
    );
    validatePass(params.req.ProposedPassword);

    return {
      ...params.user,
      id: brandedId.cognitoUser.entity.parse(params.user.id),
      /* v8 ignore next 4 */
      attributes: params.user.attributes.map((attr) => ({
        ...attr,
        id: brandedId.userAttribute.entity.parse(attr.id),
      })),
      userPoolId: brandedId.userPool.entity.parse(params.user.userPoolId),
      ...genCredentials({
        poolId: params.user.userPoolId,
        username: params.user.name,
        password: params.req.ProposedPassword,
      }),
      password: params.req.ProposedPassword,
      refreshToken: ulid(),
      challenge: undefined,
      updatedTime: Date.now(),
    };
  },
  forgotPassword: (user: CognitoUserDto): CognitoUserEntity => {
    const confirmationCode = genConfirmationCode();

    return {
      ...user,
      id: brandedId.cognitoUser.entity.parse(user.id),
      /* v8 ignore next 4 */
      attributes: user.attributes.map((attr) => ({
        ...attr,
        id: brandedId.userAttribute.entity.parse(attr.id),
      })),
      userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
      status: 'RESET_REQUIRED',
      confirmationCode,
      updatedTime: Date.now(),
    };
  },
  confirmForgotPassword: (params: {
    user: CognitoUserDto;
    confirmationCode: string;
    password: string;
  }): CognitoUserEntity => {
    const { user, confirmationCode } = params;
    cognitoAssert(
      user.confirmationCode === confirmationCode,
      'Invalid verification code provided, please try again.',
    );
    validatePass(params.password);

    return {
      ...user,
      id: brandedId.cognitoUser.entity.parse(params.user.id),
      /* v8 ignore next 4 */
      attributes: params.user.attributes.map((attr) => ({
        ...attr,
        id: brandedId.userAttribute.entity.parse(attr.id),
      })),
      userPoolId: brandedId.userPool.entity.parse(params.user.userPoolId),
      ...genCredentials({
        poolId: user.userPoolId,
        username: user.name,
        password: params.password,
      }),
      status: 'CONFIRMED',
      confirmationCode: '',
      updatedTime: Date.now(),
    };
  },
  verifyEmailAttribute: (
    user: UserDto,
    req: VerifyUserAttributeTarget['reqBody'],
  ): CognitoUserEntity => {
    assert(user.kind === 'cognito');
    assert(req.AttributeName === 'email');
    cognitoAssert(
      user.confirmationCode === req.Code,
      'Invalid verification code provided, please try again.',
    );

    return {
      ...user,
      id: brandedId.cognitoUser.entity.parse(user.id),
      /* v8 ignore next 4 */
      attributes: user.attributes.map((attr) => ({
        ...attr,
        id: brandedId.userAttribute.entity.parse(attr.id),
      })),
      userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
      status: 'CONFIRMED',
      updatedTime: Date.now(),
    };
  },
};
