import type { UserStatusType } from '@aws-sdk/client-cognito-identity-provider';
import type { EntityId } from 'src/schemas/brandedId';
import type { MFA_SETTING_LIST, PROVIDER_LIST, USER_KINDS } from 'src/schemas/constants';
import type { ChallengeVal } from 'src/schemas/user';

export type UserAttributeEntity = {
  id: EntityId['userAttribute'];
  name: string;
  value: string;
};

export type SocialUserEntity = {
  id: EntityId['socialUser'];
  kind: typeof USER_KINDS.social;
  name: string;
  enabled: boolean;
  status: typeof UserStatusType.EXTERNAL_PROVIDER;
  email: string;
  provider: (typeof PROVIDER_LIST)[number];
  password?: undefined;
  confirmationCode?: undefined;
  authorizationCode: string;
  codeChallenge: string;
  salt?: undefined;
  verifier?: undefined;
  userPoolId: EntityId['userPool'];
  attributes: UserAttributeEntity[];
  createdTime: number;
  updatedTime: number;
  challenge?: undefined;
  srpAuth?: undefined;
  preferredMfaSetting?: undefined;
  mfaSettingList?: undefined;
  totpSecretCode?: undefined;
};

export type CognitoUserEntity = {
  id: EntityId['cognitoUser'];
  kind: typeof USER_KINDS.cognito;
  name: string;
  enabled: boolean;
  status: UserStatusType;
  email: string;
  provider?: undefined;
  password: string;
  confirmationCode: string;
  authorizationCode?: undefined;
  codeChallenge?: undefined;
  salt: string;
  verifier: string;
  userPoolId: EntityId['userPool'];
  attributes: UserAttributeEntity[];
  createdTime: number;
  updatedTime: number;
  challenge?: ChallengeVal;
  srpAuth?: { timestamp: string; clientSignature: string };
  preferredMfaSetting?: (typeof MFA_SETTING_LIST)[number];
  mfaSettingList?: (typeof MFA_SETTING_LIST)[number][];
  totpSecretCode?: string;
};

export type UserEntity = SocialUserEntity | CognitoUserEntity;
