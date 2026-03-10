import type { SetUserMFAPreferenceTarget } from 'common/types/auth';
import type { CognitoUserEntity } from 'common/types/user';
import { authenticator } from 'otplib';
import { cognitoAssert } from 'service/cognitoAssert';

export const mfaMethod = {
  generateSecretCode: (user: CognitoUserEntity): CognitoUserEntity => {
    return { ...user, totpSecretCode: authenticator.generateSecret() };
  },
  verify: (user: CognitoUserEntity, userCode: string | undefined): CognitoUserEntity => {
    cognitoAssert(
      userCode && user.totpSecretCode && authenticator.check(userCode, user.totpSecretCode),
      'Invalid verification code provided, please try again.',
    );

    return { ...user, mfaSettingList: ['SOFTWARE_TOKEN_MFA'] };
  },
  // oxlint-disable-next-line complexity
  setPreference: (
    user: CognitoUserEntity,
    req: SetUserMFAPreferenceTarget['reqBody'],
  ): CognitoUserEntity => {
    const mfaSettingList: CognitoUserEntity['mfaSettingList'] =
      req.SoftwareTokenMfaSettings?.Enabled === undefined
        ? user.mfaSettingList
        : req.SoftwareTokenMfaSettings.Enabled
          ? ['SOFTWARE_TOKEN_MFA']
          : undefined;

    return {
      ...user,
      mfaSettingList,
      preferredMfaSetting:
        !mfaSettingList?.some((s) => s === 'SOFTWARE_TOKEN_MFA') ||
        req.SoftwareTokenMfaSettings?.PreferredMfa === false
          ? undefined
          : req.SoftwareTokenMfaSettings?.PreferredMfa === undefined
            ? user.preferredMfaSetting
            : 'SOFTWARE_TOKEN_MFA',
    };
  },
};
