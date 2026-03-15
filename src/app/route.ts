import assert from 'assert';
import { adminUseCase } from 'server/domain/user/useCase/adminUseCase';
import { authUseCase } from 'server/domain/user/useCase/authUseCase';
import { mfaUseCase } from 'server/domain/user/useCase/mfaUseCase';
import { signInUseCase } from 'server/domain/user/useCase/signInUseCase';
import { signUpUseCase } from 'server/domain/user/useCase/signUpUseCase';
import { userUseCase } from 'server/domain/user/useCase/userUseCase';
import { userPoolUseCase } from 'server/domain/userPool/useCase/userPoolUseCase';
import { returnPostError } from 'server/service/returnStatus';
import type { RefreshTokenAuthTarget, UserSrpAuthTarget } from 'src/schemas/signIn';
import { createRoute } from './frourio.server';

const useCases = {
  'AWSCognitoIdentityProviderService.SignUp': signUpUseCase.signUp,
  'AWSCognitoIdentityProviderService.ConfirmSignUp': signUpUseCase.confirmSignUp,
  'AWSCognitoIdentityProviderService.InitiateAuth': (
    req: UserSrpAuthTarget['reqBody'] | RefreshTokenAuthTarget['reqBody'],
  ): Promise<UserSrpAuthTarget['resBody'] | RefreshTokenAuthTarget['resBody']> =>
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

export const { GET, POST } = createRoute({
  async get() {
    return {
      status: 200,
      body: '<script>location.replace("./login")</script>',
      headers: { 'content-type': 'text/html' },
    };
  },
  async post({ headers, body }) {
    const target = headers['x-amz-target'];

    assert(target in useCases, JSON.stringify({ target, body }));

    // oxlint-disable-next-line no-explicit-any
    return useCases[target as keyof typeof useCases](body as any)
      .then((body) => ({
        status: 200 as const,
        headers: { 'content-type': 'application/x-amz-json-1.1' } as const,
        body,
      }))
      .catch(returnPostError);
  },
});
