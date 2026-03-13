/* oxlint-disable max-lines */
import type {
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AdminDeleteUserAttributesRequest,
  AdminDeleteUserAttributesResponse,
  AdminDeleteUserRequest,
  AdminGetUserRequest,
  AdminGetUserResponse,
  AdminInitiateAuthRequest,
  AdminInitiateAuthResponse,
  AdminSetUserPasswordRequest,
  AdminSetUserPasswordResponse,
  AdminUpdateUserAttributesRequest,
  AdminUpdateUserAttributesResponse,
  AssociateSoftwareTokenRequest,
  AssociateSoftwareTokenResponse,
  CodeDeliveryDetailsType,
  CreateUserPoolClientRequest,
  CreateUserPoolClientResponse,
  CreateUserPoolRequest,
  CreateUserPoolResponse,
  DeleteUserAttributesRequest,
  DeleteUserAttributesResponse,
  DeleteUserPoolClientRequest,
  DeleteUserPoolRequest,
  DeleteUserRequest,
  GetUserResponse,
  ListUserPoolClientsRequest,
  ListUserPoolClientsResponse,
  ListUserPoolsRequest,
  ListUserPoolsResponse,
  ListUsersRequest,
  ListUsersResponse,
  SetUserMFAPreferenceRequest,
  SetUserMFAPreferenceResponse,
  SignUpRequest,
  SignUpResponse,
  UpdateUserAttributesRequest,
  UpdateUserAttributesResponse,
  VerifySoftwareTokenRequest,
  VerifySoftwareTokenResponse,
  VerifyUserAttributeRequest,
  VerifyUserAttributeResponse,
} from '@aws-sdk/client-cognito-identity-provider';
import type { MaybeId } from './brandedId';
import type { InitiateAuthTarget, RespondToAuthChallengeTarget, TargetBody } from './signIn';

export type SignUpTarget = TargetBody<SignUpRequest, SignUpResponse>;

export type ConfirmSignUpTarget = TargetBody<
  { ClientId: MaybeId['userPoolClient']; ConfirmationCode: string; Username: string },
  Record<string, never>
>;

export type GetUserTarget = TargetBody<{ AccessToken: string }, GetUserResponse>;

export type RevokeTokenTarget = TargetBody<
  { ClientId: MaybeId['userPoolClient']; Token: string },
  Record<string, never>
>;

export type ResendConfirmationCodeTarget = TargetBody<
  { ClientId: MaybeId['userPoolClient']; Username: string },
  { CodeDeliveryDetails: CodeDeliveryDetailsType }
>;

export type ListUsersTarget = TargetBody<ListUsersRequest, ListUsersResponse>;

export type ListUserPoolsTarget = TargetBody<ListUserPoolsRequest, ListUserPoolsResponse>;

export type ListUserPoolClientsTarget = TargetBody<
  ListUserPoolClientsRequest,
  ListUserPoolClientsResponse
>;

export type CreateUserPoolTarget = TargetBody<CreateUserPoolRequest, CreateUserPoolResponse>;

export type CreateUserPoolClientTarget = TargetBody<
  CreateUserPoolClientRequest,
  CreateUserPoolClientResponse
>;

export type DeleteUserTarget = TargetBody<DeleteUserRequest, Record<string, never>>;

export type DeleteUserPoolTarget = TargetBody<DeleteUserPoolRequest, Record<string, never>>;

export type DeleteUserPoolClientTarget = TargetBody<
  DeleteUserPoolClientRequest,
  Record<string, never>
>;

export type AdminGetUserTarget = TargetBody<AdminGetUserRequest, AdminGetUserResponse>;

export type AdminCreateUserTarget = TargetBody<AdminCreateUserRequest, AdminCreateUserResponse>;

export type AdminDeleteUserTarget = TargetBody<AdminDeleteUserRequest, Record<string, never>>;

export type AdminInitiateAuthTarget = TargetBody<
  AdminInitiateAuthRequest,
  AdminInitiateAuthResponse
>;

export type AdminSetUserPasswordTarget = TargetBody<
  AdminSetUserPasswordRequest,
  AdminSetUserPasswordResponse
>;

export type AdminUpdateUserAttributesTarget = TargetBody<
  AdminUpdateUserAttributesRequest,
  AdminUpdateUserAttributesResponse
>;

export type AdminDeleteUserAttributesTarget = TargetBody<
  AdminDeleteUserAttributesRequest,
  AdminDeleteUserAttributesResponse
>;

export type ChangePasswordTarget = TargetBody<
  { AccessToken: string; PreviousPassword: string; ProposedPassword: string },
  Record<string, never>
>;

export type ForgotPasswordTarget = TargetBody<
  { ClientId: MaybeId['userPoolClient']; Username: string },
  { CodeDeliveryDetails: CodeDeliveryDetailsType }
>;

export type ConfirmForgotPasswordTarget = TargetBody<
  {
    ClientId: MaybeId['userPoolClient'];
    ConfirmationCode: string;
    Password: string;
    Username: string;
  },
  Record<string, never>
>;

export type UpdateUserAttributesTarget = TargetBody<
  UpdateUserAttributesRequest,
  UpdateUserAttributesResponse
>;

export type VerifyUserAttributeTarget = TargetBody<
  VerifyUserAttributeRequest,
  VerifyUserAttributeResponse
>;

export type DeleteUserAttributesTarget = TargetBody<
  DeleteUserAttributesRequest,
  DeleteUserAttributesResponse
>;

export type AssociateSoftwareTokenTarget = TargetBody<
  AssociateSoftwareTokenRequest,
  AssociateSoftwareTokenResponse
>;

export type VerifySoftwareTokenTarget = TargetBody<
  VerifySoftwareTokenRequest,
  VerifySoftwareTokenResponse
>;

export type SetUserMFAPreferenceTarget = TargetBody<
  SetUserMFAPreferenceRequest,
  SetUserMFAPreferenceResponse
>;

export type AmzTargets = {
  'AWSCognitoIdentityProviderService.SignUp': SignUpTarget;
  'AWSCognitoIdentityProviderService.ConfirmSignUp': ConfirmSignUpTarget;
  'AWSCognitoIdentityProviderService.InitiateAuth': InitiateAuthTarget;
  'AWSCognitoIdentityProviderService.RespondToAuthChallenge': RespondToAuthChallengeTarget;
  'AWSCognitoIdentityProviderService.GetUser': GetUserTarget;
  'AWSCognitoIdentityProviderService.RevokeToken': RevokeTokenTarget;
  'AWSCognitoIdentityProviderService.ResendConfirmationCode': ResendConfirmationCodeTarget;
  'AWSCognitoIdentityProviderService.ListUsers': ListUsersTarget;
  'AWSCognitoIdentityProviderService.ListUserPools': ListUserPoolsTarget;
  'AWSCognitoIdentityProviderService.ListUserPoolClients': ListUserPoolClientsTarget;
  'AWSCognitoIdentityProviderService.CreateUserPool': CreateUserPoolTarget;
  'AWSCognitoIdentityProviderService.CreateUserPoolClient': CreateUserPoolClientTarget;
  'AWSCognitoIdentityProviderService.DeleteUser': DeleteUserTarget;
  'AWSCognitoIdentityProviderService.DeleteUserPool': DeleteUserPoolTarget;
  'AWSCognitoIdentityProviderService.DeleteUserPoolClient': DeleteUserPoolClientTarget;
  'AWSCognitoIdentityProviderService.AdminGetUser': AdminGetUserTarget;
  'AWSCognitoIdentityProviderService.AdminCreateUser': AdminCreateUserTarget;
  'AWSCognitoIdentityProviderService.AdminDeleteUser': AdminDeleteUserTarget;
  'AWSCognitoIdentityProviderService.AdminInitiateAuth': AdminInitiateAuthTarget;
  'AWSCognitoIdentityProviderService.AdminSetUserPassword': AdminSetUserPasswordTarget;
  'AWSCognitoIdentityProviderService.AdminUpdateUserAttributes': AdminUpdateUserAttributesTarget;
  'AWSCognitoIdentityProviderService.AdminDeleteUserAttributes': AdminDeleteUserAttributesTarget;
  'AWSCognitoIdentityProviderService.ChangePassword': ChangePasswordTarget;
  'AWSCognitoIdentityProviderService.ForgotPassword': ForgotPasswordTarget;
  'AWSCognitoIdentityProviderService.ConfirmForgotPassword': ConfirmForgotPasswordTarget;
  'AWSCognitoIdentityProviderService.UpdateUserAttributes': UpdateUserAttributesTarget;
  'AWSCognitoIdentityProviderService.VerifyUserAttribute': VerifyUserAttributeTarget;
  'AWSCognitoIdentityProviderService.DeleteUserAttributes': DeleteUserAttributesTarget;
  'AWSCognitoIdentityProviderService.AssociateSoftwareToken': AssociateSoftwareTokenTarget;
  'AWSCognitoIdentityProviderService.VerifySoftwareToken': VerifySoftwareTokenTarget;
  'AWSCognitoIdentityProviderService.SetUserMFAPreference': SetUserMFAPreferenceTarget;
};
