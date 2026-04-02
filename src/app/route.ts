import { adminUseCase } from 'server/domain/user/useCase/adminUseCase';
import { authUseCase } from 'server/domain/user/useCase/authUseCase';
import { mfaUseCase } from 'server/domain/user/useCase/mfaUseCase';
import { signInUseCase } from 'server/domain/user/useCase/signInUseCase';
import { signUpUseCase } from 'server/domain/user/useCase/signUpUseCase';
import { userUseCase } from 'server/domain/user/useCase/userUseCase';
import { userPoolUseCase } from 'server/domain/userPool/useCase/userPoolUseCase';
import { COGNITO_ERRORS, CognitoError } from 'server/service/cognitoAssert';
import type { RefreshTokenAuthTarget, UserSrpAuthTarget } from 'src/schemas/signIn';
import type z from 'zod';
import type { frourioSpec } from './frourio';
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
  'AWSCognitoIdentityProviderService.AdminUserGlobalSignOut': adminUseCase.userGlobalSignOut,
  'AWSCognitoIdentityProviderService.ChangePassword': authUseCase.changePassword,
  'AWSCognitoIdentityProviderService.ForgotPassword': authUseCase.forgotPassword,
  'AWSCognitoIdentityProviderService.ConfirmForgotPassword': authUseCase.confirmForgotPassword,
  'AWSCognitoIdentityProviderService.UpdateUserAttributes': authUseCase.updateUserAttributes,
  'AWSCognitoIdentityProviderService.VerifyUserAttribute': authUseCase.verifyUserAttribute,
  'AWSCognitoIdentityProviderService.DeleteUserAttributes': authUseCase.deleteUserAttributes,
  'AWSCognitoIdentityProviderService.AssociateSoftwareToken': mfaUseCase.associateSoftwareToken,
  'AWSCognitoIdentityProviderService.VerifySoftwareToken': mfaUseCase.verifySoftwareToken,
  'AWSCognitoIdentityProviderService.SetUserMFAPreference': mfaUseCase.setUserMFAPreference,
  'AWSCognitoIdentityProviderService.GetTokensFromRefreshToken':
    signInUseCase.getTokensFromRefreshToken,
};

/* v8 ignore next */
const returnPostError = (
  e: unknown,
):
  | {
      status: 400;
      headers: z.infer<(typeof frourioSpec)['post']['res'][400]['headers']>;
      body: z.infer<(typeof frourioSpec)['post']['res'][400]['body']>;
    }
  | { status: 403; body: z.infer<(typeof frourioSpec)['post']['res'][403]['body']> } => {
  if (e instanceof CognitoError) {
    const type = COGNITO_ERRORS[e.message as keyof typeof COGNITO_ERRORS];

    return {
      status: 400,
      headers: { 'X-Amzn-Errormessage': e.message, 'X-Amzn-Errortype': type },
      body: { message: e.message, __type: type },
    };
  }

  if (!(e instanceof Error)) return { status: 403, body: { message: 'UnknownError' } };

  console.log(new Date(), e.stack);

  return { status: 403, body: { message: e.message } };
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
    const key = headers['x-amz-target'];

    if (!(key in useCases)) return { status: 403, body: { message: 'NotImplementedError' } };

    // oxlint-disable-next-line no-explicit-any
    return useCases[key as keyof typeof useCases](body as any)
      .then((body) => ({
        status: 200 as const,
        headers: { 'content-type': 'application/x-amz-json-1.1' } as const,
        body,
      }))
      .catch(returnPostError);
  },
});
