import type AmzType from '@aws-sdk/client-cognito-identity-provider';
import type { MaybeId } from './brandedId';
import type { TargetBody } from './signIn';

export type SignUpTarget = TargetBody<AmzType.SignUpRequest, AmzType.SignUpResponse>;

export type ConfirmSignUpTarget = TargetBody<
  { ClientId: MaybeId['userPoolClient']; ConfirmationCode: string; Username: string },
  Record<string, never>
>;

export type GetUserTarget = TargetBody<{ AccessToken: string }, AmzType.GetUserResponse>;

export type RevokeTokenTarget = TargetBody<
  { ClientId: MaybeId['userPoolClient']; Token: string },
  Record<string, never>
>;

export type ResendConfirmationCodeTarget = TargetBody<
  { ClientId: MaybeId['userPoolClient']; Username: string },
  { CodeDeliveryDetails: AmzType.CodeDeliveryDetailsType }
>;

export type ListUsersTarget = TargetBody<AmzType.ListUsersRequest, AmzType.ListUsersResponse>;

export type ListUserPoolsTarget = TargetBody<
  AmzType.ListUserPoolsRequest,
  AmzType.ListUserPoolsResponse
>;

export type ListUserPoolClientsTarget = TargetBody<
  AmzType.ListUserPoolClientsRequest,
  AmzType.ListUserPoolClientsResponse
>;

export type CreateUserPoolTarget = TargetBody<
  AmzType.CreateUserPoolRequest,
  AmzType.CreateUserPoolResponse
>;

export type CreateUserPoolClientTarget = TargetBody<
  AmzType.CreateUserPoolClientRequest,
  AmzType.CreateUserPoolClientResponse
>;

export type DeleteUserTarget = TargetBody<AmzType.DeleteUserRequest, Record<string, never>>;

export type DeleteUserPoolTarget = TargetBody<AmzType.DeleteUserPoolRequest, Record<string, never>>;

export type DeleteUserPoolClientTarget = TargetBody<
  AmzType.DeleteUserPoolClientRequest,
  Record<string, never>
>;

export type AdminGetUserTarget = TargetBody<
  AmzType.AdminGetUserRequest,
  AmzType.AdminGetUserResponse
>;

export type AdminCreateUserTarget = TargetBody<
  AmzType.AdminCreateUserRequest,
  AmzType.AdminCreateUserResponse
>;

export type AdminDeleteUserTarget = TargetBody<
  AmzType.AdminDeleteUserRequest,
  Record<string, never>
>;

export type AdminInitiateAuthTarget = TargetBody<
  AmzType.AdminInitiateAuthRequest,
  AmzType.AdminInitiateAuthResponse
>;

export type AdminSetUserPasswordTarget = TargetBody<
  AmzType.AdminSetUserPasswordRequest,
  AmzType.AdminSetUserPasswordResponse
>;

export type AdminUpdateUserAttributesTarget = TargetBody<
  AmzType.AdminUpdateUserAttributesRequest,
  AmzType.AdminUpdateUserAttributesResponse
>;

export type AdminDeleteUserAttributesTarget = TargetBody<
  AmzType.AdminDeleteUserAttributesRequest,
  AmzType.AdminDeleteUserAttributesResponse
>;

export type ChangePasswordTarget = TargetBody<
  { AccessToken: string; PreviousPassword: string; ProposedPassword: string },
  Record<string, never>
>;

export type ForgotPasswordTarget = TargetBody<
  { ClientId: MaybeId['userPoolClient']; Username: string },
  { CodeDeliveryDetails: AmzType.CodeDeliveryDetailsType }
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
  AmzType.UpdateUserAttributesRequest,
  AmzType.UpdateUserAttributesResponse
>;

export type VerifyUserAttributeTarget = TargetBody<
  AmzType.VerifyUserAttributeRequest,
  AmzType.VerifyUserAttributeResponse
>;

export type DeleteUserAttributesTarget = TargetBody<
  AmzType.DeleteUserAttributesRequest,
  AmzType.DeleteUserAttributesResponse
>;

export type AssociateSoftwareTokenTarget = TargetBody<
  AmzType.AssociateSoftwareTokenRequest,
  AmzType.AssociateSoftwareTokenResponse
>;

export type VerifySoftwareTokenTarget = TargetBody<
  AmzType.VerifySoftwareTokenRequest,
  AmzType.VerifySoftwareTokenResponse
>;

export type SetUserMFAPreferenceTarget = TargetBody<
  AmzType.SetUserMFAPreferenceRequest,
  AmzType.SetUserMFAPreferenceResponse
>;
