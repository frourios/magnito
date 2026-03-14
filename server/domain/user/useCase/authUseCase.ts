import type { UserType } from '@aws-sdk/client-cognito-identity-provider';
import { createDecoder } from 'fast-jwt';
import { userPoolQuery } from 'server/domain/userPool/store/userPoolQuery';
import { customAssert } from 'server/service/customAssert';
import { pretendAsDate } from 'server/service/pretendAsDate';
import { transaction } from 'server/service/transaction';
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
} from 'src/schemas/auth';
import { TokenJwtSchema } from 'src/schemas/jwt';
import { cognitoUserMethod } from '../model/cognitoUserMethod';
import { userMethod } from '../model/userMethod';
import { toAttributeTypes } from '../service/createAttributes';
import { genCodeDeliveryDetails } from '../service/genCodeDeliveryDetails';
import { sendConfirmationCode } from '../service/sendAuthMail';
import { userCommand } from '../store/userCommand';
import { userQuery } from '../store/userQuery';

const decoder = createDecoder();

export const authUseCase = {
  getUser: (req: GetUserTarget['reqBody']): Promise<GetUserTarget['resBody']> =>
    transaction(async (tx) => {
      const payload = TokenJwtSchema.safeParse(decoder(req.AccessToken));

      customAssert(payload.success, 'Eliminate fraudulent requests');

      const user = await userQuery.findById(tx, payload.data.sub);

      return {
        UserAttributes: toAttributeTypes(user),
        Username: user.name,
        PreferredMfaSetting: user.preferredMfaSetting,
        UserMFASettingList: user.mfaSettingList,
      };
    }),
  listUsers: (req: ListUsersTarget['reqBody']): Promise<ListUsersTarget['resBody']> =>
    transaction(async (tx) => {
      customAssert(req.UserPoolId, 'Eliminate fraudulent requests');

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
      const payload = TokenJwtSchema.safeParse(decoder(req.AccessToken));

      customAssert(payload.success, 'Eliminate fraudulent requests');

      const user = await userQuery.findById(tx, payload.data.sub);

      customAssert(user.kind === 'cognito', 'Eliminate fraudulent requests');

      await userCommand.save(tx, cognitoUserMethod.changePassword({ user, req }));

      return {};
    }),
  forgotPassword: (
    req: ForgotPasswordTarget['reqBody'],
  ): Promise<ForgotPasswordTarget['resBody']> =>
    transaction(async (tx) => {
      const poolClient = await userPoolQuery.findClientById(tx, req.ClientId);
      const user = await userQuery.findByName(tx, req.Username);

      customAssert(poolClient.userPoolId === user.userPoolId, 'Eliminate fraudulent requests');
      customAssert(user.kind === 'cognito', 'Eliminate fraudulent requests');

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

      customAssert(user.kind === 'cognito', 'Eliminate fraudulent requests');

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
      customAssert(req.AccessToken, 'Eliminate fraudulent requests');

      const payload = TokenJwtSchema.safeParse(decoder(req.AccessToken));

      customAssert(payload.success, 'Eliminate fraudulent requests');

      const user = await userQuery.findById(tx, payload.data.sub);
      const updated = userMethod.updateAttributes(user, req.UserAttributes);

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
      customAssert(req.AccessToken, 'Eliminate fraudulent requests');

      const payload = TokenJwtSchema.safeParse(decoder(req.AccessToken));

      customAssert(payload.success, 'Eliminate fraudulent requests');

      const user = await userQuery.findById(tx, payload.data.sub);

      await userCommand.save(tx, cognitoUserMethod.verifyEmailAttribute(user, req));

      return {};
    }),
  deleteUserAttributes: (
    req: DeleteUserAttributesTarget['reqBody'],
  ): Promise<DeleteUserAttributesTarget['resBody']> =>
    transaction(async (tx) => {
      customAssert(req.AccessToken, 'Eliminate fraudulent requests');

      const payload = TokenJwtSchema.safeParse(decoder(req.AccessToken));

      customAssert(payload.success, 'Eliminate fraudulent requests');

      const user = await userQuery.findById(tx, payload.data.sub);

      await userCommand.save(tx, userMethod.deleteAttributes(user, req.UserAttributeNames));

      return {};
    }),
};
