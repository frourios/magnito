/* oxlint-disable max-lines */
import {
  AdvancedSecurityEnabledModeType,
  AdvancedSecurityModeType,
  AliasAttributeType,
  AuthFlowType,
  ChallengeNameType,
  DeletionProtectionType,
  ExplicitAuthFlowsType,
  OAuthFlowType,
  PreventUserExistenceErrorTypes,
  UsernameAttributeType,
  UserPoolMfaType,
  UserStatusType,
  VerifiedAttributeType,
} from '@aws-sdk/client-cognito-identity-provider';
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
  AttributeType,
  CodeDeliveryDetailsType,
  ContextDataType,
  CreateUserPoolClientRequest,
  CreateUserPoolClientResponse,
  CreateUserPoolRequest,
  CreateUserPoolResponse,
  DeleteUserAttributesRequest,
  DeleteUserAttributesResponse,
  DeleteUserPoolClientRequest,
  DeleteUserPoolRequest,
  DeleteUserRequest,
  DeliveryMediumType,
  GetUserResponse,
  ListUserPoolClientsRequest,
  ListUserPoolClientsResponse,
  ListUsersRequest,
  ListUsersResponse,
  MFAOptionType,
  SetUserMFAPreferenceRequest,
  SetUserMFAPreferenceResponse,
  SignUpRequest,
  SignUpResponse,
  UpdateUserAttributesRequest,
  UpdateUserAttributesResponse,
  UserContextDataType,
  UserType,
  VerifySoftwareTokenRequest,
  VerifySoftwareTokenResponse,
  VerifyUserAttributeRequest,
  VerifyUserAttributeResponse,
} from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';
import { brandedId, type MaybeId } from './brandedId';
import type { InferTargetType } from './signIn';
import {
  createTargetBodySchema,
  InitiateAuthTargetSchema,
  RespondToAuthChallengeTargetSchema,
} from './signIn';

const AttributeTypeSchema: z.ZodType<AttributeType> = z.object({
  Name: z.string(),
  Value: z.string().optional(),
});

const UserContextDataTypeSchema: z.ZodType<UserContextDataType> = z.object({
  IpAddress: z.string().optional(),
  EncodedData: z.string().optional(),
});

const DeliveryMediumTypeSchema: z.ZodType<DeliveryMediumType> = z.enum(['EMAIL', 'SMS']);

const CodeDeliveryDetailsTypeSchema: z.ZodType<CodeDeliveryDetailsType> = z.object({
  Destination: z.string().optional(),
  DeliveryMedium: DeliveryMediumTypeSchema.optional(),
  AttributeName: z.string().optional(),
});

export const SignUpTargetSchema = createTargetBodySchema<SignUpRequest, SignUpResponse>(
  z.object({
    ClientId: z.string(),
    SecretHash: z.string().optional(),
    Username: z.string(),
    Password: z.string(),
    UserAttributes: z.array(AttributeTypeSchema).optional(),
    ValidationData: z.array(AttributeTypeSchema).optional(),
    AnalyticsMetadata: z.object({ AnalyticsEndpointId: z.string().optional() }).optional(),
    UserContextData: UserContextDataTypeSchema.optional(),
    ClientMetadata: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    UserConfirmed: z.boolean(),
    CodeDeliveryDetails: CodeDeliveryDetailsTypeSchema.optional(),
    UserSub: z.string(),
  }),
);

export type SignUpTarget = InferTargetType<typeof SignUpTargetSchema>;

export const ConfirmSignUpTargetSchema = createTargetBodySchema<
  { ClientId: MaybeId['userPoolClient']; ConfirmationCode: string; Username: string },
  Record<string, never>
>(
  z.object({
    ClientId: brandedId.userPoolClient.maybe,
    ConfirmationCode: z.string(),
    Username: z.string(),
  }),
  z.record(z.string(), z.never()),
);

export type ConfirmSignUpTarget = InferTargetType<typeof ConfirmSignUpTargetSchema>;

const MFAOptionTypeSchema: z.ZodType<MFAOptionType> = z.object({
  DeliveryMedium: DeliveryMediumTypeSchema.optional(),
  AttributeName: z.string().optional(),
});

export const GetUserTargetSchema = createTargetBodySchema<{ AccessToken: string }, GetUserResponse>(
  z.object({ AccessToken: z.string() }),
  z.object({
    Username: z.string(),
    UserAttributes: z.array(AttributeTypeSchema),
    MFAOptions: z.array(MFAOptionTypeSchema).optional(),
    PreferredMfaSetting: z.string().optional(),
    UserMFASettingList: z.array(z.string()).optional(),
  }),
);

export type GetUserTarget = InferTargetType<typeof GetUserTargetSchema>;

export const RevokeTokenTargetSchema = createTargetBodySchema<
  { ClientId: MaybeId['userPoolClient']; Token: string },
  Record<string, never>
>(
  z.object({ ClientId: brandedId.userPoolClient.maybe, Token: z.string() }),
  z.record(z.string(), z.never()),
);

export type RevokeTokenTarget = InferTargetType<typeof RevokeTokenTargetSchema>;

export const ResendConfirmationCodeTargetSchema = createTargetBodySchema<
  { ClientId: MaybeId['userPoolClient']; Username: string },
  { CodeDeliveryDetails: CodeDeliveryDetailsType }
>(
  z.object({ ClientId: brandedId.userPoolClient.maybe, Username: z.string() }),
  z.object({ CodeDeliveryDetails: CodeDeliveryDetailsTypeSchema }),
);

export type ResendConfirmationCodeTarget = InferTargetType<
  typeof ResendConfirmationCodeTargetSchema
>;

const UserTypeSchema: z.ZodType<UserType> = z.object({
  Username: z.string(),
  Attributes: z.array(AttributeTypeSchema).optional(),
  UserCreateDate: z.date().optional(),
  UserLastModifiedDate: z.date().optional(),
  Enabled: z.boolean().optional(),
  UserStatus: z
    .enum([
      UserStatusType.ARCHIVED,
      UserStatusType.COMPROMISED,
      UserStatusType.CONFIRMED,
      UserStatusType.EXTERNAL_PROVIDER,
      UserStatusType.FORCE_CHANGE_PASSWORD,
      UserStatusType.RESET_REQUIRED,
      UserStatusType.UNCONFIRMED,
      UserStatusType.UNKNOWN,
    ])
    .optional(),
  MFAOptions: z.array(MFAOptionTypeSchema).optional(),
});

export const ListUsersTargetSchema = createTargetBodySchema<ListUsersRequest, ListUsersResponse>(
  z.object({
    UserPoolId: brandedId.userPool.maybe,
    AttributesToGet: z.array(z.string()).optional(),
    Limit: z.number().optional(),
    PaginationToken: z.string().optional(),
    Filter: z.string().optional(),
  }),
  z.object({ Users: z.array(UserTypeSchema).optional(), PaginationToken: z.string().optional() }),
);

export type ListUsersTarget = InferTargetType<typeof ListUsersTargetSchema>;

const UserPoolDescriptionTypeSchema = z.object({
  Id: z.string().optional(),
  Name: z.string().optional(),
  LambdaConfig: z.object({}).optional(),
  Status: z.string().optional(),
  LastModifiedDate: z.date().optional(),
  CreationDate: z.date().optional(),
});

const UserPoolClientDescriptionSchema = z.object({
  ClientId: z.string().optional(),
  UserPoolId: z.string().optional(),
  ClientName: z.string().optional(),
});

export const ListUserPoolsTargetSchema = createTargetBodySchema(
  z.object({
    NextToken: z.string().optional(),
    MaxResults: z.number(),
  }),
  z.object({
    UserPools: z.array(UserPoolDescriptionTypeSchema).optional(),
    NextToken: z.string().optional(),
  }),
);

export type ListUserPoolsTarget = InferTargetType<typeof ListUserPoolsTargetSchema>;

export const ListUserPoolClientsTargetSchema = createTargetBodySchema<
  ListUserPoolClientsRequest,
  ListUserPoolClientsResponse
>(
  z.object({
    UserPoolId: brandedId.userPool.maybe,
    MaxResults: z.number(),
    NextToken: z.string().optional(),
  }),
  z.object({
    UserPoolClients: z.array(UserPoolClientDescriptionSchema).optional(),
    NextToken: z.string().optional(),
  }),
);

export type ListUserPoolClientsTarget = InferTargetType<typeof ListUserPoolClientsTargetSchema>;

export const CreateUserPoolTargetSchema = createTargetBodySchema<
  CreateUserPoolRequest,
  CreateUserPoolResponse
>(
  z.object({
    PoolName: z.string(),
    Policies: z.object({}).optional(),
    DeletionProtection: z
      .enum([DeletionProtectionType.ACTIVE, DeletionProtectionType.INACTIVE])
      .optional(),
    LambdaConfig: z.object({}).optional(),
    AutoVerifiedAttributes: z
      .array(z.enum([VerifiedAttributeType.EMAIL, VerifiedAttributeType.PHONE_NUMBER]))
      .optional(),
    AliasAttributes: z
      .array(
        z.enum([
          AliasAttributeType.EMAIL,
          AliasAttributeType.PHONE_NUMBER,
          AliasAttributeType.PREFERRED_USERNAME,
        ]),
      )
      .optional(),
    UsernameAttributes: z
      .array(z.enum([UsernameAttributeType.EMAIL, UsernameAttributeType.PHONE_NUMBER]))
      .optional(),
    SmsVerificationMessage: z.string().optional(),
    EmailVerificationMessage: z.string().optional(),
    EmailVerificationSubject: z.string().optional(),
    VerificationMessageTemplate: z.object({}).optional(),
    SmsAuthenticationMessage: z.string().optional(),
    MfaConfiguration: z
      .enum([UserPoolMfaType.ON, UserPoolMfaType.OFF, UserPoolMfaType.OPTIONAL])
      .optional(),
    UserAttributeUpdateSettings: z.object({}).optional(),
    DeviceConfiguration: z.object({}).optional(),
    EmailConfiguration: z.object({}).optional(),
    SmsConfiguration: z
      .object({
        SnsCallerArn: z.string(),
        ExternalId: z.string().optional(),
        SnsRegion: z.string().optional(),
      })
      .optional(),
    UserPoolTags: z.record(z.string(), z.string()).optional(),
    AdminCreateUserConfig: z.object({}).optional(),
    Schema: z.array(z.object({})).optional(),
    UserPoolAddOns: z
      .object({
        AdvancedSecurityMode: z.enum([
          AdvancedSecurityModeType.AUDIT,
          AdvancedSecurityModeType.ENFORCED,
          AdvancedSecurityModeType.OFF,
        ]),
        AdvancedSecurityAdditionalFlows: z
          .object({
            CustomAuthMode: z.enum([
              AdvancedSecurityEnabledModeType.AUDIT,
              AdvancedSecurityEnabledModeType.ENFORCED,
            ]),
          })
          .optional(),
      })
      .optional(),
    UsernameConfiguration: z.object({ CaseSensitive: z.boolean() }).optional(),
    AccountRecoverySetting: z.object({}).optional(),
  }),
  z.object({ UserPool: z.object({}).optional() }),
);

export type CreateUserPoolTarget = InferTargetType<typeof CreateUserPoolTargetSchema>;

export const CreateUserPoolClientTargetSchema = createTargetBodySchema<
  CreateUserPoolClientRequest,
  CreateUserPoolClientResponse
>(
  z.object({
    UserPoolId: brandedId.userPool.maybe,
    ClientName: z.string(),
    GenerateSecret: z.boolean().optional(),
    RefreshTokenValidity: z.number().optional(),
    AccessTokenValidity: z.number().optional(),
    IdTokenValidity: z.number().optional(),
    TokenValidityUnits: z.object({}).optional(),
    ReadAttributes: z.array(z.string()).optional(),
    WriteAttributes: z.array(z.string()).optional(),
    ExplicitAuthFlows: z
      .array(
        z.enum([
          ExplicitAuthFlowsType.ADMIN_NO_SRP_AUTH,
          ExplicitAuthFlowsType.ALLOW_ADMIN_USER_PASSWORD_AUTH,
          ExplicitAuthFlowsType.ALLOW_CUSTOM_AUTH,
          ExplicitAuthFlowsType.ALLOW_REFRESH_TOKEN_AUTH,
          ExplicitAuthFlowsType.ALLOW_USER_PASSWORD_AUTH,
          ExplicitAuthFlowsType.ALLOW_USER_SRP_AUTH,
          ExplicitAuthFlowsType.CUSTOM_AUTH_FLOW_ONLY,
          ExplicitAuthFlowsType.USER_PASSWORD_AUTH,
        ]),
      )
      .optional(),
    SupportedIdentityProviders: z.array(z.string()).optional(),
    CallbackURLs: z.array(z.string()).optional(),
    LogoutURLs: z.array(z.string()).optional(),
    DefaultRedirectURI: z.string().optional(),
    AllowedOAuthFlows: z
      .array(z.enum([OAuthFlowType.client_credentials, OAuthFlowType.code, OAuthFlowType.implicit]))
      .optional(),
    AllowedOAuthScopes: z.array(z.string()).optional(),
    AllowedOAuthFlowsUserPoolClient: z.boolean().optional(),
    AnalyticsConfiguration: z.object({}).optional(),
    PreventUserExistenceErrors: z
      .enum([PreventUserExistenceErrorTypes.ENABLED, PreventUserExistenceErrorTypes.LEGACY])
      .optional(),
    EnableTokenRevocation: z.boolean().optional(),
    EnablePropagateAdditionalUserContextData: z.boolean().optional(),
    AuthSessionValidity: z.number().optional(),
  }),
  z.object({ UserPoolClient: z.object({}).optional() }),
);

export type CreateUserPoolClientTarget = InferTargetType<typeof CreateUserPoolClientTargetSchema>;

export const DeleteUserTargetSchema = createTargetBodySchema<
  DeleteUserRequest,
  Record<string, never>
>(z.object({ AccessToken: z.string() }), z.record(z.string(), z.never()));

export type DeleteUserTarget = InferTargetType<typeof DeleteUserTargetSchema>;

export const DeleteUserPoolTargetSchema = createTargetBodySchema<
  DeleteUserPoolRequest,
  Record<string, never>
>(z.object({ UserPoolId: brandedId.userPool.maybe }), z.record(z.string(), z.never()));

export type DeleteUserPoolTarget = InferTargetType<typeof DeleteUserPoolTargetSchema>;

export const DeleteUserPoolClientTargetSchema = createTargetBodySchema<
  DeleteUserPoolClientRequest,
  Record<string, never>
>(
  z.object({ UserPoolId: brandedId.userPool.maybe, ClientId: brandedId.userPoolClient.maybe }),
  z.record(z.string(), z.never()),
);

export type DeleteUserPoolClientTarget = InferTargetType<typeof DeleteUserPoolClientTargetSchema>;

export const AdminGetUserTargetSchema = createTargetBodySchema<
  AdminGetUserRequest,
  AdminGetUserResponse
>(
  z.object({ UserPoolId: brandedId.userPool.maybe, Username: z.string() }),
  z.object({
    Username: z.string(),
    UserAttributes: z.array(AttributeTypeSchema).optional(),
    UserCreateDate: z.date().optional(),
    UserLastModifiedDate: z.date().optional(),
    Enabled: z.boolean().optional(),
    UserStatus: z
      .enum([
        UserStatusType.ARCHIVED,
        UserStatusType.COMPROMISED,
        UserStatusType.CONFIRMED,
        UserStatusType.EXTERNAL_PROVIDER,
        UserStatusType.FORCE_CHANGE_PASSWORD,
        UserStatusType.RESET_REQUIRED,
        UserStatusType.UNCONFIRMED,
        UserStatusType.UNKNOWN,
      ])
      .optional(),
    MFAOptions: z.array(MFAOptionTypeSchema).optional(),
    PreferredMfaSetting: z.string().optional(),
    UserMFASettingList: z.array(z.string()).optional(),
  }),
);

export type AdminGetUserTarget = InferTargetType<typeof AdminGetUserTargetSchema>;

export const AdminCreateUserTargetSchema = createTargetBodySchema<
  AdminCreateUserRequest,
  AdminCreateUserResponse
>(
  z.object({
    UserPoolId: brandedId.userPool.maybe,
    Username: z.string(),
    UserAttributes: z.array(AttributeTypeSchema).optional(),
    ValidationData: z.array(AttributeTypeSchema).optional(),
    TemporaryPassword: z.string().optional(),
    ForceAliasCreation: z.boolean().optional(),
    MessageAction: z.enum(['RESEND', 'SUPPRESS']).optional(),
    DesiredDeliveryMediums: z.array(DeliveryMediumTypeSchema).optional(),
    ClientMetadata: z.record(z.string(), z.string()).optional(),
  }),
  z.object({ User: UserTypeSchema.optional() }),
);

export type AdminCreateUserTarget = InferTargetType<typeof AdminCreateUserTargetSchema>;

export const AdminDeleteUserTargetSchema = createTargetBodySchema<
  AdminDeleteUserRequest,
  Record<string, never>
>(
  z.object({ UserPoolId: brandedId.userPool.maybe, Username: z.string() }),
  z.record(z.string(), z.never()),
);

export type AdminDeleteUserTarget = InferTargetType<typeof AdminDeleteUserTargetSchema>;

const ContextDataTypeSchema: z.ZodType<ContextDataType> = z.object({
  IpAddress: z.string(),
  ServerName: z.string(),
  ServerPath: z.string(),
  HttpHeaders: z.array(
    z.object({ headerName: z.string().optional(), headerValue: z.string().optional() }),
  ),
  EncodedData: z.string().optional(),
});

export const AdminInitiateAuthTargetSchema = createTargetBodySchema<
  AdminInitiateAuthRequest,
  AdminInitiateAuthResponse
>(
  z.object({
    UserPoolId: brandedId.userPool.maybe,
    ClientId: brandedId.userPoolClient.maybe,
    AuthFlow: z.enum([
      AuthFlowType.ADMIN_NO_SRP_AUTH,
      AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
      AuthFlowType.CUSTOM_AUTH,
      AuthFlowType.REFRESH_TOKEN,
      AuthFlowType.REFRESH_TOKEN_AUTH,
      AuthFlowType.USER_PASSWORD_AUTH,
      AuthFlowType.USER_SRP_AUTH,
    ]),
    AuthParameters: z.record(z.string(), z.string()).optional(),
    ClientMetadata: z.record(z.string(), z.string()).optional(),
    AnalyticsMetadata: z.object({ AnalyticsEndpointId: z.string().optional() }).optional(),
    ContextData: ContextDataTypeSchema.optional(),
  }),
  z.object({
    ChallengeName: z
      .enum([
        ChallengeNameType.ADMIN_NO_SRP_AUTH,
        ChallengeNameType.CUSTOM_CHALLENGE,
        ChallengeNameType.DEVICE_PASSWORD_VERIFIER,
        ChallengeNameType.DEVICE_SRP_AUTH,
        ChallengeNameType.MFA_SETUP,
        ChallengeNameType.NEW_PASSWORD_REQUIRED,
        ChallengeNameType.PASSWORD_VERIFIER,
        ChallengeNameType.SELECT_MFA_TYPE,
        ChallengeNameType.SMS_MFA,
        ChallengeNameType.SOFTWARE_TOKEN_MFA,
      ])
      .optional(),
    Session: z.string().optional(),
    ChallengeParameters: z.record(z.string(), z.string()).optional(),
    AuthenticationResult: z
      .object({
        AccessToken: z.string().optional(),
        ExpiresIn: z.number().optional(),
        TokenType: z.string().optional(),
        RefreshToken: z.string().optional(),
        IdToken: z.string().optional(),
        NewDeviceMetadata: z.object({}).optional(),
      })
      .optional(),
  }),
);

export type AdminInitiateAuthTarget = InferTargetType<typeof AdminInitiateAuthTargetSchema>;

export const AdminSetUserPasswordTargetSchema = createTargetBodySchema<
  AdminSetUserPasswordRequest,
  AdminSetUserPasswordResponse
>(
  z.object({
    UserPoolId: brandedId.userPool.maybe,
    Username: z.string(),
    Password: z.string(),
    Permanent: z.boolean().optional(),
  }),
  z.record(z.string(), z.never()),
);

export type AdminSetUserPasswordTarget = InferTargetType<typeof AdminSetUserPasswordTargetSchema>;

export const AdminUpdateUserAttributesTargetSchema = createTargetBodySchema<
  AdminUpdateUserAttributesRequest,
  AdminUpdateUserAttributesResponse
>(
  z.object({
    UserPoolId: brandedId.userPool.maybe,
    Username: z.string(),
    UserAttributes: z.array(AttributeTypeSchema),
    ClientMetadata: z.record(z.string(), z.string()).optional(),
  }),
  z.record(z.string(), z.never()),
);

export type AdminUpdateUserAttributesTarget = InferTargetType<
  typeof AdminUpdateUserAttributesTargetSchema
>;

export const AdminDeleteUserAttributesTargetSchema = createTargetBodySchema<
  AdminDeleteUserAttributesRequest,
  AdminDeleteUserAttributesResponse
>(
  z.object({
    UserPoolId: brandedId.userPool.maybe,
    Username: z.string(),
    UserAttributeNames: z.array(z.string()),
  }),
  z.record(z.string(), z.never()),
);

export type AdminDeleteUserAttributesTarget = InferTargetType<
  typeof AdminDeleteUserAttributesTargetSchema
>;

export const ChangePasswordTargetSchema = createTargetBodySchema<
  { AccessToken: string; PreviousPassword: string; ProposedPassword: string },
  Record<string, never>
>(
  z.object({ AccessToken: z.string(), PreviousPassword: z.string(), ProposedPassword: z.string() }),
  z.record(z.string(), z.never()),
);

export type ChangePasswordTarget = InferTargetType<typeof ChangePasswordTargetSchema>;

export const ForgotPasswordTargetSchema = createTargetBodySchema<
  { ClientId: MaybeId['userPoolClient']; Username: string },
  { CodeDeliveryDetails: CodeDeliveryDetailsType }
>(
  z.object({ ClientId: brandedId.userPoolClient.maybe, Username: z.string() }),
  z.object({ CodeDeliveryDetails: CodeDeliveryDetailsTypeSchema }),
);

export type ForgotPasswordTarget = InferTargetType<typeof ForgotPasswordTargetSchema>;

export const ConfirmForgotPasswordTargetSchema = createTargetBodySchema<
  {
    ClientId: MaybeId['userPoolClient'];
    ConfirmationCode: string;
    Password: string;
    Username: string;
  },
  Record<string, never>
>(
  z.object({
    ClientId: brandedId.userPoolClient.maybe,
    ConfirmationCode: z.string(),
    Password: z.string(),
    Username: z.string(),
  }),
  z.record(z.string(), z.never()),
);

export type ConfirmForgotPasswordTarget = InferTargetType<typeof ConfirmForgotPasswordTargetSchema>;

export const UpdateUserAttributesTargetSchema = createTargetBodySchema<
  UpdateUserAttributesRequest,
  UpdateUserAttributesResponse
>(
  z.object({
    UserAttributes: z.array(AttributeTypeSchema),
    AccessToken: z.string(),
    ClientMetadata: z.record(z.string(), z.string()).optional(),
  }),
  z.object({ CodeDeliveryDetailsList: z.array(CodeDeliveryDetailsTypeSchema).optional() }),
);

export type UpdateUserAttributesTarget = InferTargetType<typeof UpdateUserAttributesTargetSchema>;

export const VerifyUserAttributeTargetSchema = createTargetBodySchema<
  VerifyUserAttributeRequest,
  VerifyUserAttributeResponse
>(
  z.object({ AccessToken: z.string(), AttributeName: z.string(), Code: z.string() }),
  z.record(z.string(), z.never()),
);

export type VerifyUserAttributeTarget = InferTargetType<typeof VerifyUserAttributeTargetSchema>;

export const DeleteUserAttributesTargetSchema = createTargetBodySchema<
  DeleteUserAttributesRequest,
  DeleteUserAttributesResponse
>(
  z.object({ UserAttributeNames: z.array(z.string()), AccessToken: z.string() }),
  z.record(z.string(), z.never()),
);

export type DeleteUserAttributesTarget = InferTargetType<typeof DeleteUserAttributesTargetSchema>;

export const AssociateSoftwareTokenTargetSchema = createTargetBodySchema<
  AssociateSoftwareTokenRequest,
  AssociateSoftwareTokenResponse
>(
  z.object({ AccessToken: z.string().optional(), Session: z.string().optional() }),
  z.object({ SecretCode: z.string().optional(), Session: z.string().optional() }),
);

export type AssociateSoftwareTokenTarget = InferTargetType<
  typeof AssociateSoftwareTokenTargetSchema
>;

export const VerifySoftwareTokenTargetSchema = createTargetBodySchema<
  VerifySoftwareTokenRequest,
  VerifySoftwareTokenResponse
>(
  z.object({
    AccessToken: z.string().optional(),
    Session: z.string().optional(),
    UserCode: z.string(),
    FriendlyDeviceName: z.string().optional(),
  }),
  z.object({ Status: z.enum(['ERROR', 'SUCCESS']).optional(), Session: z.string().optional() }),
);

export type VerifySoftwareTokenTarget = InferTargetType<typeof VerifySoftwareTokenTargetSchema>;

const SMSMfaSettingsTypeSchema = z.object({
  Enabled: z.boolean().optional(),
  PreferredMfa: z.boolean().optional(),
});

const SoftwareTokenMfaSettingsTypeSchema = z.object({
  Enabled: z.boolean().optional(),
  PreferredMfa: z.boolean().optional(),
});

export const SetUserMFAPreferenceTargetSchema = createTargetBodySchema<
  SetUserMFAPreferenceRequest,
  SetUserMFAPreferenceResponse
>(
  z.object({
    SMSMfaSettings: SMSMfaSettingsTypeSchema.optional(),
    SoftwareTokenMfaSettings: SoftwareTokenMfaSettingsTypeSchema.optional(),
    AccessToken: z.string(),
  }),
  z.record(z.string(), z.never()),
);

export type SetUserMFAPreferenceTarget = InferTargetType<typeof SetUserMFAPreferenceTargetSchema>;

export const AmzTargetKeys = [
  'AWSCognitoIdentityProviderService.SignUp',
  'AWSCognitoIdentityProviderService.ConfirmSignUp',
  'AWSCognitoIdentityProviderService.InitiateAuth',
  'AWSCognitoIdentityProviderService.RespondToAuthChallenge',
  'AWSCognitoIdentityProviderService.GetUser',
  'AWSCognitoIdentityProviderService.RevokeToken',
  'AWSCognitoIdentityProviderService.ResendConfirmationCode',
  'AWSCognitoIdentityProviderService.ListUsers',
  'AWSCognitoIdentityProviderService.ListUserPools',
  'AWSCognitoIdentityProviderService.ListUserPoolClients',
  'AWSCognitoIdentityProviderService.CreateUserPool',
  'AWSCognitoIdentityProviderService.CreateUserPoolClient',
  'AWSCognitoIdentityProviderService.DeleteUser',
  'AWSCognitoIdentityProviderService.DeleteUserPool',
  'AWSCognitoIdentityProviderService.DeleteUserPoolClient',
  'AWSCognitoIdentityProviderService.AdminGetUser',
  'AWSCognitoIdentityProviderService.AdminCreateUser',
  'AWSCognitoIdentityProviderService.AdminDeleteUser',
  'AWSCognitoIdentityProviderService.AdminInitiateAuth',
  'AWSCognitoIdentityProviderService.AdminSetUserPassword',
  'AWSCognitoIdentityProviderService.AdminUpdateUserAttributes',
  'AWSCognitoIdentityProviderService.AdminDeleteUserAttributes',
  'AWSCognitoIdentityProviderService.ChangePassword',
  'AWSCognitoIdentityProviderService.ForgotPassword',
  'AWSCognitoIdentityProviderService.ConfirmForgotPassword',
  'AWSCognitoIdentityProviderService.UpdateUserAttributes',
  'AWSCognitoIdentityProviderService.VerifyUserAttribute',
  'AWSCognitoIdentityProviderService.DeleteUserAttributes',
  'AWSCognitoIdentityProviderService.AssociateSoftwareToken',
  'AWSCognitoIdentityProviderService.VerifySoftwareToken',
  'AWSCognitoIdentityProviderService.SetUserMFAPreference',
] as const;

export const AmzTargetSchemas = {
  'AWSCognitoIdentityProviderService.SignUp': SignUpTargetSchema,
  'AWSCognitoIdentityProviderService.ConfirmSignUp': ConfirmSignUpTargetSchema,
  'AWSCognitoIdentityProviderService.InitiateAuth': InitiateAuthTargetSchema,
  'AWSCognitoIdentityProviderService.RespondToAuthChallenge': RespondToAuthChallengeTargetSchema,
  'AWSCognitoIdentityProviderService.GetUser': GetUserTargetSchema,
  'AWSCognitoIdentityProviderService.RevokeToken': RevokeTokenTargetSchema,
  'AWSCognitoIdentityProviderService.ResendConfirmationCode': ResendConfirmationCodeTargetSchema,
  'AWSCognitoIdentityProviderService.ListUsers': ListUsersTargetSchema,
  'AWSCognitoIdentityProviderService.ListUserPools': ListUserPoolsTargetSchema,
  'AWSCognitoIdentityProviderService.ListUserPoolClients': ListUserPoolClientsTargetSchema,
  'AWSCognitoIdentityProviderService.CreateUserPool': CreateUserPoolTargetSchema,
  'AWSCognitoIdentityProviderService.CreateUserPoolClient': CreateUserPoolClientTargetSchema,
  'AWSCognitoIdentityProviderService.DeleteUser': DeleteUserTargetSchema,
  'AWSCognitoIdentityProviderService.DeleteUserPool': DeleteUserPoolTargetSchema,
  'AWSCognitoIdentityProviderService.DeleteUserPoolClient': DeleteUserPoolClientTargetSchema,
  'AWSCognitoIdentityProviderService.AdminGetUser': AdminGetUserTargetSchema,
  'AWSCognitoIdentityProviderService.AdminCreateUser': AdminCreateUserTargetSchema,
  'AWSCognitoIdentityProviderService.AdminDeleteUser': AdminDeleteUserTargetSchema,
  'AWSCognitoIdentityProviderService.AdminInitiateAuth': AdminInitiateAuthTargetSchema,
  'AWSCognitoIdentityProviderService.AdminSetUserPassword': AdminSetUserPasswordTargetSchema,
  'AWSCognitoIdentityProviderService.AdminUpdateUserAttributes':
    AdminUpdateUserAttributesTargetSchema,
  'AWSCognitoIdentityProviderService.AdminDeleteUserAttributes':
    AdminDeleteUserAttributesTargetSchema,
  'AWSCognitoIdentityProviderService.ChangePassword': ChangePasswordTargetSchema,
  'AWSCognitoIdentityProviderService.ForgotPassword': ForgotPasswordTargetSchema,
  'AWSCognitoIdentityProviderService.ConfirmForgotPassword': ConfirmForgotPasswordTargetSchema,
  'AWSCognitoIdentityProviderService.UpdateUserAttributes': UpdateUserAttributesTargetSchema,
  'AWSCognitoIdentityProviderService.VerifyUserAttribute': VerifyUserAttributeTargetSchema,
  'AWSCognitoIdentityProviderService.DeleteUserAttributes': DeleteUserAttributesTargetSchema,
  'AWSCognitoIdentityProviderService.AssociateSoftwareToken': AssociateSoftwareTokenTargetSchema,
  'AWSCognitoIdentityProviderService.VerifySoftwareToken': VerifySoftwareTokenTargetSchema,
  'AWSCognitoIdentityProviderService.SetUserMFAPreference': SetUserMFAPreferenceTargetSchema,
} satisfies Record<(typeof AmzTargetKeys)[number], unknown>;

export type AmzTargets = {
  [Key in keyof typeof AmzTargetSchemas]: InferTargetType<(typeof AmzTargetSchemas)[Key]>;
};
