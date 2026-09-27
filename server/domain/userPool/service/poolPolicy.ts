import type * as Cognito from '@aws-sdk/client-cognito-identity-provider';
import type { UserPool } from '../../../prisma/client';
import { cognitoAssert } from '../../../service/cognitoAssert';

export type PoolPolicy = Pick<
  UserPool,
  | 'passwordMinimumLength'
  | 'passwordRequireLowercase'
  | 'passwordRequireUppercase'
  | 'passwordRequireNumbers'
  | 'passwordRequireSymbols'
  | 'passwordHistorySize'
  | 'temporaryPasswordValidityDays'
  | 'allowedFirstAuthFactors'
>;

const validInteger = (value: number | undefined, min: number, max: number): boolean =>
  value === undefined || (Number.isInteger(value) && value >= min && value <= max);

// oxlint-disable-next-line complexity
export const poolPolicyData = (policies: Cognito.UserPoolPolicyType | undefined): PoolPolicy => {
  const password = policies?.PasswordPolicy;
  const factors = policies?.SignInPolicy?.AllowedFirstAuthFactors;
  cognitoAssert(
    validInteger(password?.MinimumLength, 6, 99) &&
      validInteger(password?.PasswordHistorySize, 0, 24) &&
      validInteger(password?.TemporaryPasswordValidityDays, 0, 365) &&
      [
        password?.RequireLowercase,
        password?.RequireUppercase,
        password?.RequireNumbers,
        password?.RequireSymbols,
      ].every((value) => value === undefined || typeof value === 'boolean') &&
      (factors === undefined ||
        (Array.isArray(factors) &&
          factors.length >= 1 &&
          factors.length <= 5 &&
          factors.every((factor) =>
            ['PASSWORD', 'EMAIL_OTP', 'SMS_OTP', 'WEB_AUTHN'].includes(factor),
          ))),
    'Invalid user pool policy.',
  );

  return {
    passwordMinimumLength: password?.MinimumLength ?? 8,
    passwordRequireLowercase: password?.RequireLowercase ?? true,
    passwordRequireUppercase: password?.RequireUppercase ?? true,
    passwordRequireNumbers: password?.RequireNumbers ?? true,
    passwordRequireSymbols: password?.RequireSymbols ?? true,
    passwordHistorySize: password?.PasswordHistorySize ?? 0,
    temporaryPasswordValidityDays: password?.TemporaryPasswordValidityDays || 7,
    allowedFirstAuthFactors: factors ?? ['PASSWORD'],
  };
};

export const toCognitoPolicies = (policy: PoolPolicy): Cognito.UserPoolPolicyType => ({
  PasswordPolicy: {
    MinimumLength: policy.passwordMinimumLength,
    RequireLowercase: policy.passwordRequireLowercase,
    RequireUppercase: policy.passwordRequireUppercase,
    RequireNumbers: policy.passwordRequireNumbers,
    RequireSymbols: policy.passwordRequireSymbols,
    PasswordHistorySize: policy.passwordHistorySize || undefined,
    TemporaryPasswordValidityDays: policy.temporaryPasswordValidityDays,
  },
  SignInPolicy: {
    AllowedFirstAuthFactors: policy.allowedFirstAuthFactors as Cognito.AuthFactorType[],
  },
});

export const requirePasswordAuth = (policy: PoolPolicy): void => {
  cognitoAssert(
    policy.allowedFirstAuthFactors.includes('PASSWORD'),
    'Password sign-in is disabled.',
  );
};
