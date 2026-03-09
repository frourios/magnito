import assert from 'assert';
import type { UserType } from '@aws-sdk/client-cognito-identity-provider';
import type {
  ChangePasswordTarget,
  ConfirmForgotPasswordTarget,
  DeleteUserAttributesTarget,
  ForgotPasswordTarget,
  GetUserTarget,
  ListUsersTarget,
  RevokeTokenTarget,
  UpdateUserAttributesTarget,
  VerifyUserAttributeTarget,
} from 'common/types/auth';
import { cognitoUserMethod } from 'domain/user/model/cognitoUserMethod';
import { userCommand } from 'domain/user/repository/userCommand';
import { userQuery } from 'domain/user/repository/userQuery';
import { userPoolQuery } from 'domain/userPool/repository/userPoolQuery';
import { jwtDecode } from 'jwt-decode';
import { pretendAsDate } from 'service/pretendAsDate';
import { transaction } from 'service/prismaClient';
import type { AccessTokenJwt } from 'service/types';
import { toAttributeTypes } from '../service/createAttributes';
import { genCodeDeliveryDetails } from '../service/genCodeDeliveryDetails';
import { sendConfirmationCode } from '../service/sendAuthMail';

export const authUseCase = {
  getUser: (req: GetUserTarget['reqBody']): Promise<GetUserTarget['resBody']> =>
    transaction(async (tx) => {
      const decoded = jwtDecode<AccessTokenJwt>(req.AccessToken);
      const user = await userQuery.findById(tx, decoded.sub);

      return {
        UserAttributes: toAttributeTypes(user),
        Username: user.name,
        PreferredMfaSetting: user.preferredMfaSetting,
        UserMFASettingList: user.mfaSettingList,
      };
    }),
  listUsers: (req: ListUsersTarget['reqBody']): Promise<ListUsersTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.UserPoolId);
      const users = await userQuery.listAll(tx, req.UserPoolId, req.Limit);

      return {
        Users: users.map(
          (user): UserType => ({
            Username: user.name,
            Attributes: toAttributeTypes(user),
            UserCreateDate: pretendAsDate(user.createdTime),
            UserLastModifiedDate: pretendAsDate(user.updatedTime),
            Enabled: user.enabled,
            UserStatus: user.status,
          }),
        ),
      };
    }),
  revokeToken: (req: RevokeTokenTarget['reqBody']): Promise<RevokeTokenTarget['resBody']> =>
    transaction(async (tx) => {
      await userQuery.findByRefreshToken(tx, req.Token);

      return {};
    }),
  changePassword: (
    req: ChangePasswordTarget['reqBody'],
  ): Promise<ChangePasswordTarget['resBody']> =>
    transaction(async (tx) => {
      const decoded = jwtDecode<AccessTokenJwt>(req.AccessToken);
      const user = await userQuery.findById(tx, decoded.sub);

      assert(user.kind === 'cognito');

      await userCommand.save(tx, cognitoUserMethod.changePassword({ user, req }));

      return {};
    }),
  forgotPassword: (
    req: ForgotPasswordTarget['reqBody'],
  ): Promise<ForgotPasswordTarget['resBody']> =>
    transaction(async (tx) => {
      const poolClient = await userPoolQuery.findClientById(tx, req.ClientId);
      const user = await userQuery.findByName(tx, req.Username);

      assert(poolClient.userPoolId === user.userPoolId);
      assert(user.kind === 'cognito');

      const forgotUser = cognitoUserMethod.forgotPassword(user);
      await userCommand.save(tx, forgotUser);
      await sendConfirmationCode(forgotUser);

      return { CodeDeliveryDetails: genCodeDeliveryDetails(forgotUser) };
    }),
  confirmForgotPassword: (
    req: ConfirmForgotPasswordTarget['reqBody'],
  ): Promise<ConfirmForgotPasswordTarget['resBody']> =>
    transaction(async (tx) => {
      const user = await userQuery.findByName(tx, req.Username);

      assert(user.kind === 'cognito');

      await userCommand.save(
        tx,
        cognitoUserMethod.confirmForgotPassword({
          user,
          confirmationCode: req.ConfirmationCode,
          password: req.Password,
        }),
      );

      return {};
    }),
  updateUserAttributes: (
    req: UpdateUserAttributesTarget['reqBody'],
  ): Promise<UpdateUserAttributesTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.AccessToken);

      const decoded = jwtDecode<AccessTokenJwt>(req.AccessToken);
      const user = await userQuery.findById(tx, decoded.sub);
      const updated = cognitoUserMethod.updateAttributes(user, req.UserAttributes);

      await userCommand.save(tx, updated);

      if (updated.kind === 'cognito' && user.confirmationCode !== updated.confirmationCode) {
        await sendConfirmationCode(updated);
      }

      return { CodeDeliveryDetailsList: [genCodeDeliveryDetails(updated)] };
    }),
  verifyUserAttribute: (
    req: VerifyUserAttributeTarget['reqBody'],
  ): Promise<VerifyUserAttributeTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.AccessToken);

      const decoded = jwtDecode<AccessTokenJwt>(req.AccessToken);
      const user = await userQuery.findById(tx, decoded.sub);

      await userCommand.save(tx, cognitoUserMethod.verifyAttribute(user, req));

      return {};
    }),
  deleteUserAttributes: (
    req: DeleteUserAttributesTarget['reqBody'],
  ): Promise<DeleteUserAttributesTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.AccessToken);

      const decoded = jwtDecode<AccessTokenJwt>(req.AccessToken);
      const user = await userQuery.findById(tx, decoded.sub);

      await userCommand.save(tx, cognitoUserMethod.deleteAttributes(user, req.UserAttributeNames));

      return {};
    }),
};
