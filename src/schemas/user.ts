import { UserStatusType } from '@aws-sdk/client-cognito-identity-provider';
import { PROVIDER_LIST, USER_KINDS, MFA_SETTING_LIST } from 'src/schemas/constants';
import { z } from 'zod';
import { brandedId } from './brandedId';

export const ChallengeValSchema = z.object({
  secretBlock: z.string(),
  pubA: z.string(),
  pubB: z.string(),
  secB: z.string(),
});

export type ChallengeVal = z.infer<typeof ChallengeValSchema>;

export const UserAttributeDtoSchema = z.object({
  id: brandedId.userAttribute.dto,
  name: z.string(),
  value: z.string(),
});

export type UserAttributeDto = z.infer<typeof UserAttributeDtoSchema>;

export const SocialUserDtoSchema = z.object({
  id: brandedId.socialUser.dto,
  kind: z.literal(USER_KINDS.social),
  name: z.string(),
  enabled: z.boolean(),
  status: z.literal(UserStatusType.EXTERNAL_PROVIDER),
  email: z.string().email(),
  provider: z.enum(PROVIDER_LIST),
  password: z.undefined().optional(),
  confirmationCode: z.undefined().optional(),
  authorizationCode: z.string(),
  codeChallenge: z.string(),
  salt: z.undefined().optional(),
  verifier: z.undefined().optional(),
  userPoolId: brandedId.userPool.dto,
  attributes: z.array(UserAttributeDtoSchema),
  createdTime: z.number(),
  updatedTime: z.number(),
  challenge: z.undefined().optional(),
  srpAuth: z.undefined().optional(),
  preferredMfaSetting: z.undefined().optional(),
  mfaSettingList: z.undefined().optional(),
  totpSecretCode: z.undefined().optional(),
});

export type SocialUserDto = z.infer<typeof SocialUserDtoSchema>;

export const CognitoUserDtoSchema = z.object({
  id: brandedId.cognitoUser.dto,
  kind: z.literal(USER_KINDS.cognito),
  name: z.string(),
  enabled: z.boolean(),
  status: z.enum([
    UserStatusType.ARCHIVED,
    UserStatusType.COMPROMISED,
    UserStatusType.CONFIRMED,
    UserStatusType.FORCE_CHANGE_PASSWORD,
    UserStatusType.RESET_REQUIRED,
    UserStatusType.UNCONFIRMED,
    UserStatusType.UNKNOWN,
  ]),
  email: z.string().email(),
  provider: z.undefined().optional(),
  password: z.string(),
  confirmationCode: z.string(),
  authorizationCode: z.undefined().optional(),
  codeChallenge: z.undefined().optional(),
  salt: z.string(),
  verifier: z.string(),
  userPoolId: brandedId.userPool.dto,
  attributes: z.array(UserAttributeDtoSchema),
  createdTime: z.number(),
  updatedTime: z.number(),
  challenge: ChallengeValSchema.optional(),
  srpAuth: z.object({ timestamp: z.string(), clientSignature: z.string() }).optional(),
  preferredMfaSetting: z.enum(MFA_SETTING_LIST).optional(),
  mfaSettingList: z.array(z.enum(MFA_SETTING_LIST)).optional(),
  totpSecretCode: z.string().optional(),
});

export type CognitoUserDto = z.infer<typeof CognitoUserDtoSchema>;

export const UserDtoSchema = SocialUserDtoSchema.or(CognitoUserDtoSchema);

export type UserDto = z.infer<typeof UserDtoSchema>;

export const SocialUserCreateValSchema = z.object({
  provider: z.enum(PROVIDER_LIST),
  name: z.string(),
  email: z.string().email(),
  codeChallenge: z.string(),
  photoUrl: z.string().optional(),
  userPoolClientId: brandedId.userPoolClient.maybe,
});

export type SocialUserCreateVal = z.infer<typeof SocialUserCreateValSchema>;

export const SocialUserRequestTokensValSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string(),
  client_id: brandedId.userPoolClient.maybe,
  redirect_uri: z.string().url(),
  code_verifier: z.string(),
});

export type SocialUserRequestTokensVal = z.infer<typeof SocialUserRequestTokensValSchema>;

export const SocialUserResponseTokensValSchema = z.object({
  id_token: z.string(),
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.literal('Bearer'),
});

export type SocialUserResponseTokensVal = z.infer<typeof SocialUserResponseTokensValSchema>;
