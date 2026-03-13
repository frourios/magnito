import assert from 'assert';
import type { AmzTargets } from 'schemas/auth';
import { adminUseCase } from 'server/domain/user/useCase/adminUseCase';
import { authUseCase } from 'server/domain/user/useCase/authUseCase';
import { mfaUseCase } from 'server/domain/user/useCase/mfaUseCase';
import { signInUseCase } from 'server/domain/user/useCase/signInUseCase';
import { signUpUseCase } from 'server/domain/user/useCase/signUpUseCase';
import { userUseCase } from 'server/domain/user/useCase/userUseCase';
import { userPoolUseCase } from 'server/domain/userPool/useCase/userPoolUseCase';
import { returnPostError } from 'server/service/returnStatus';
import { createRoute } from './frourio.server';

const useCases: {
  [Target in keyof AmzTargets]: (
    req: AmzTargets[Target]['reqBody'],
  ) => Promise<AmzTargets[Target]['resBody']>;
} = {
  'AWSCognitoIdentityProviderService.SignUp': signUpUseCase.signUp,
  'AWSCognitoIdentityProviderService.ConfirmSignUp': signUpUseCase.confirmSignUp,
  'AWSCognitoIdentityProviderService.InitiateAuth': (req) =>
    req.AuthFlow === 'USER_SRP_AUTH'
      ? signInUseCase.userSrpAuth(req)
      : signInUseCase.refreshTokenAuth(req),
  'AWSCognitoIdentityProviderService.RespondToAuthChallenge': signInUseCase.respondToAuthChallenge,
  'AWSCognitoIdentityProviderService.GetUser': authUseCase.getUser,
  'AWSCognitoIdentityProviderService.RevokeToken': authUseCase.revokeToken,
  'AWSCognitoIdentityProviderService.ResendConfirmationCode': signUpUseCase.resendConfirmationCode,
  'AWSCognitoIdentityProviderService.ListUserPools': userPoolUseCase.listUserPools,
  'AWSCognitoIdentityProviderService.ListUserPoolClients': userPoolUseCase.listUserPoolClients,
  'AWSCognitoIdentityProviderService.CreateUserPool': userPoolUseCase.createUserPool,
  'AWSCognitoIdentityProviderService.CreateUserPoolClient': userPoolUseCase.createUserPoolClient,
  'AWSCognitoIdentityProviderService.DeleteUser': userUseCase.deleteUser,
  'AWSCognitoIdentityProviderService.DeleteUserPool': userPoolUseCase.deleteUserPool,
  'AWSCognitoIdentityProviderService.DeleteUserPoolClient': userPoolUseCase.deleteUserPoolClient,
  'AWSCognitoIdentityProviderService.ListUsers': authUseCase.listUsers,
  'AWSCognitoIdentityProviderService.AdminGetUser': adminUseCase.getUser,
  'AWSCognitoIdentityProviderService.AdminCreateUser': adminUseCase.createUser,
  'AWSCognitoIdentityProviderService.AdminDeleteUser': adminUseCase.deleteUser,
  'AWSCognitoIdentityProviderService.AdminInitiateAuth': adminUseCase.initiateAuth,
  'AWSCognitoIdentityProviderService.AdminSetUserPassword': adminUseCase.setUserPassword,
  'AWSCognitoIdentityProviderService.AdminUpdateUserAttributes': adminUseCase.updateUserAttributes,
  'AWSCognitoIdentityProviderService.AdminDeleteUserAttributes': adminUseCase.deleteUserAttributes,
  'AWSCognitoIdentityProviderService.ChangePassword': authUseCase.changePassword,
  'AWSCognitoIdentityProviderService.ForgotPassword': authUseCase.forgotPassword,
  'AWSCognitoIdentityProviderService.ConfirmForgotPassword': authUseCase.confirmForgotPassword,
  'AWSCognitoIdentityProviderService.UpdateUserAttributes': authUseCase.updateUserAttributes,
  'AWSCognitoIdentityProviderService.VerifyUserAttribute': authUseCase.verifyUserAttribute,
  'AWSCognitoIdentityProviderService.DeleteUserAttributes': authUseCase.deleteUserAttributes,
  'AWSCognitoIdentityProviderService.AssociateSoftwareToken': mfaUseCase.associateSoftwareToken,
  'AWSCognitoIdentityProviderService.VerifySoftwareToken': mfaUseCase.verifySoftwareToken,
  'AWSCognitoIdentityProviderService.SetUserMFAPreference': mfaUseCase.setUserMFAPreference,
};

const main = <T extends keyof AmzTargets>(target: T, body: AmzTargets[T]['reqBody']) => {
  assert(useCases[target], JSON.stringify({ target, body }));

  return useCases[target](body);
};

export const { GET, POST } = createRoute({
  async get() {
    return {
      status: 200,
      body: '<script>location.replace("./login")</script>',
      headers: { 'Content-Type': 'text/html' },
    };
  },
  async post({ headers, body }) {
    return main(headers['x-amz-target'], body)
      .then((body) => ({
        status: 200 as const,
        headers: { 'content-type': 'application/x-amz-json-1.1' } as const,
        body,
      }))
      .catch(returnPostError);
  },
});
