import { generateSecret, verifySync } from 'otplib';
import type { SetUserMFAPreferenceTarget } from 'schemas/auth';
import { brandedId } from 'schemas/brandedId';
import type { CognitoUserDto } from 'schemas/user';
import { cognitoAssert } from 'server/service/cognitoAssert';
import type { CognitoUserEntity } from './userType';

export const mfaMethod = {
  generateSecretCode: (user: CognitoUserDto): CognitoUserEntity => {
    return {
      ...user,
      id: brandedId.cognitoUser.entity.parse(user.id),
      attributes: user.attributes.map((attr) => ({
        ...attr,
        id: brandedId.userAttribute.entity.parse(attr.id),
      })),
      userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
      totpSecretCode: generateSecret(),
    };
  },
  verify: (user: CognitoUserDto, userCode: string | undefined): CognitoUserEntity => {
    cognitoAssert(
      userCode &&
        user.totpSecretCode &&
        verifySync({ secret: user.totpSecretCode, token: userCode }).valid,
      'Invalid verification code provided, please try again.',
    );

    return {
      ...user,
      id: brandedId.cognitoUser.entity.parse(user.id),
      attributes: user.attributes.map((attr) => ({
        ...attr,
        id: brandedId.userAttribute.entity.parse(attr.id),
      })),
      userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
      mfaSettingList: ['SOFTWARE_TOKEN_MFA'],
    };
  },
  // oxlint-disable-next-line complexity
  setPreference: (
    user: CognitoUserDto,
    req: SetUserMFAPreferenceTarget['reqBody'],
  ): CognitoUserEntity => {
    const mfaSettingList: CognitoUserDto['mfaSettingList'] =
      req.SoftwareTokenMfaSettings?.Enabled === undefined
        ? user.mfaSettingList
        : req.SoftwareTokenMfaSettings.Enabled
          ? ['SOFTWARE_TOKEN_MFA']
          : undefined;

    return {
      ...user,
      id: brandedId.cognitoUser.entity.parse(user.id),
      attributes: user.attributes.map((attr) => ({
        ...attr,
        id: brandedId.userAttribute.entity.parse(attr.id),
      })),
      userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
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
