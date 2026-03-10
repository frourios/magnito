import assert from 'assert';
import type {
  ConfirmSignUpTarget,
  ResendConfirmationCodeTarget,
  SignUpTarget,
} from 'common/types/auth';
import { cognitoUserMethod } from 'domain/user/model/cognitoUserMethod';
import { userCommand } from 'domain/user/repository/userCommand';
import { userQuery } from 'domain/user/repository/userQuery';
import { userPoolQuery } from 'domain/userPool/repository/userPoolQuery';
import { transaction } from 'service/prismaClient';
import { findEmail } from '../service/findEmail';
import { genCodeDeliveryDetails } from '../service/genCodeDeliveryDetails';
import { sendConfirmationCode } from '../service/sendAuthMail';

export const signUpUseCase = {
  signUp: (req: SignUpTarget['reqBody']): Promise<SignUpTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.ClientId);
      assert(req.Username);
      assert(req.Password);

      const poolClient = await userPoolQuery.findClientById(tx, req.ClientId);
      const idCount = await userQuery.countId(tx, req.Username);
      const email = findEmail(req.UserAttributes);
      const user = cognitoUserMethod.create(idCount, {
        name: req.Username,
        email,
        password: req.Password,
        userPoolId: poolClient.userPoolId,
        attributes: req.UserAttributes,
      });

      await userCommand.save(tx, user);
      await sendConfirmationCode(user);

      return {
        CodeDeliveryDetails: genCodeDeliveryDetails(user),
        UserConfirmed: false,
        UserSub: user.id,
      };
    }),
  confirmSignUp: (req: ConfirmSignUpTarget['reqBody']): Promise<ConfirmSignUpTarget['resBody']> =>
    transaction(async (tx) => {
      const user = await userQuery.findByName(tx, req.Username);

      assert(user.kind === 'cognito');

      const confirmed = cognitoUserMethod.confirm(user, req.ConfirmationCode);

      await userCommand.save(tx, confirmed);

      return {};
    }),
  resendConfirmationCode: (
    req: ResendConfirmationCodeTarget['reqBody'],
  ): Promise<ResendConfirmationCodeTarget['resBody']> =>
    transaction(async (tx) => {
      const poolClient = await userPoolQuery.findClientById(tx, req.ClientId);
      const user = await userQuery.findByName(tx, req.Username);

      assert(poolClient.userPoolId === user.userPoolId);
      assert(user.kind === 'cognito');

      await sendConfirmationCode(user);

      return { CodeDeliveryDetails: genCodeDeliveryDetails(user) };
    }),
};
