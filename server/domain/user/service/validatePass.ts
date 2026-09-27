import { cognitoAssert } from '../../../service/cognitoAssert';
import type { PoolPolicy } from '../../userPool/service/poolPolicy';

// oxlint-disable-next-line complexity
export function validatePass(password: string, policy: PoolPolicy): asserts password {
  cognitoAssert(
    password.length >= policy.passwordMinimumLength,
    'Password did not conform with policy: Password not long enough',
  );
  cognitoAssert(password.length <= 256, 'Password did not conform with policy: Password too long');
  cognitoAssert(
    !policy.passwordRequireLowercase || /[a-z]/.test(password),
    'Password did not conform with policy: Password must have lowercase characters',
  );
  cognitoAssert(
    !policy.passwordRequireUppercase || /[A-Z]/.test(password),
    'Password did not conform with policy: Password must have uppercase characters',
  );
  cognitoAssert(
    !policy.passwordRequireNumbers || /[0-9]/.test(password),
    'Password did not conform with policy: Password must have numeric characters',
  );
  cognitoAssert(
    !policy.passwordRequireSymbols ||
      /[!-/:-@[-`{-~]/.test(password) ||
      password.slice(1, -1).includes(' '),
    'Password did not conform with policy: Password must have symbol characters',
  );
}
