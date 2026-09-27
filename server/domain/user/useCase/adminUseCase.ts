import assert from 'assert';
import type {
  AdminCreateUserTarget,
  AdminDeleteUserAttributesTarget,
  AdminDeleteUserTarget,
  AdminGetUserTarget,
  AdminSetUserPasswordTarget,
  AdminUpdateUserAttributesTarget,
  AdminUserGlobalSignOutTarget,
} from '../../../../src/schemas/auth';
import { userPoolQuery } from '../../../domain/userPool/store/userPoolQuery';
import type { Prisma } from '../../../prisma/client';
import { prismaClient } from '../../../service/prismaClient';
import { transaction } from '../../../service/transaction';
import { adminMethod } from '../model/adminMethod';
import { userMethod } from '../model/userMethod';
import type { CognitoUserEntity } from '../model/userType';
import { toAttributeTypes } from '../service/createAttributes';
import { sendTemporaryPassword } from '../service/sendAuthMail';
import { userCommand } from '../store/userCommand';
import { userQuery } from '../store/userQuery';
import { userTokenCommand } from '../store/userTokenCommand';
import { adminAuthUseCase } from './adminAuthUseCase';

const createUser = async (
  tx: Prisma.TransactionClient,
  req: AdminCreateUserTarget['reqBody'],
): Promise<CognitoUserEntity> => {
  assert(req.Username);
  assert(req.UserPoolId);

  const userPool = await userPoolQuery.findById(tx, req.UserPoolId);
  const idCount = await userQuery.countUsername(tx, req.Username, userPool.id);
  const user = adminMethod.createVerifiedUser(idCount, req, userPool.id);

  await userCommand.save(tx, user);

  return user;
};

export const adminUseCase = {
  getUser: async (req: AdminGetUserTarget['reqBody']): Promise<AdminGetUserTarget['resBody']> => {
    assert(req.Username);
    const user = await userQuery.findByName(prismaClient, req.Username);
    assert(user.userPoolId === req.UserPoolId);

    return { Username: user.name, UserAttributes: toAttributeTypes(user), UserStatus: user.status };
  },
  createUser: (req: AdminCreateUserTarget['reqBody']): Promise<AdminCreateUserTarget['resBody']> =>
    transaction('RepeatableRead', async (tx) => {
      assert(req.Username);

      const user = await (req.MessageAction === 'RESEND'
        ? userQuery.findByName(tx, req.Username)
        : createUser(tx, req));

      assert(user.kind === 'cognito');

      if (req.MessageAction !== 'SUPPRESS') await sendTemporaryPassword(user);

      return {
        User: { Username: user.name, Attributes: toAttributeTypes(user), UserStatus: user.status },
      };
    }),
  deleteUser: (req: AdminDeleteUserTarget['reqBody']): Promise<AdminDeleteUserTarget['resBody']> =>
    transaction('RepeatableRead', async (tx) => {
      assert(req.Username);
      assert(req.UserPoolId);

      const user = await userQuery.findByName(tx, req.Username);
      const deletableId = adminMethod.deleteUser(user, req.UserPoolId);

      await userTokenCommand.deleteByUserId(tx, deletableId);
      await userCommand.delete(tx, deletableId);

      return {};
    }),
  initiateAuth: adminAuthUseCase.initiate,
  respondToAuthChallenge: adminAuthUseCase.respond,
  setUserPassword: (
    req: AdminSetUserPasswordTarget['reqBody'],
  ): Promise<AdminSetUserPasswordTarget['resBody']> =>
    transaction('RepeatableRead', async (tx) => {
      assert(req.Username);
      assert(req.UserPoolId);

      const user = await userQuery.findByNameInPool(tx, req.Username, req.UserPoolId);

      assert(user.kind === 'cognito');

      await userCommand.save(tx, adminMethod.setUserPassword(user, req));

      return {};
    }),
  updateUserAttributes: (
    req: AdminUpdateUserAttributesTarget['reqBody'],
  ): Promise<AdminUpdateUserAttributesTarget['resBody']> =>
    transaction('RepeatableRead', async (tx) => {
      assert(req.Username);

      const user = await userQuery.findByName(tx, req.Username);

      assert(user.kind === 'cognito');

      await userCommand.save(tx, adminMethod.updateAttributes(user, req.UserAttributes));

      return {};
    }),
  deleteUserAttributes: (
    req: AdminDeleteUserAttributesTarget['reqBody'],
  ): Promise<AdminDeleteUserAttributesTarget['resBody']> =>
    transaction('RepeatableRead', async (tx) => {
      assert(req.Username);

      const user = await userQuery.findByName(tx, req.Username);

      await userCommand.save(tx, userMethod.deleteAttributes(user, req.UserAttributeNames));

      return {};
    }),
  userGlobalSignOut: (
    req: AdminUserGlobalSignOutTarget['reqBody'],
  ): Promise<AdminUserGlobalSignOutTarget['resBody']> =>
    transaction('RepeatableRead', async (tx) => {
      assert(req.Username);
      assert(req.UserPoolId);

      const user = await userQuery.findByName(tx, req.Username);
      assert(user.userPoolId === req.UserPoolId);

      await userTokenCommand.revokeAllByUserId(tx, user.id);

      return {};
    }),
};
