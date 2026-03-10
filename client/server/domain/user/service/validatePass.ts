import { cognitoAssert } from 'service/cognitoAssert';

export function validatePass(password: string): asserts password {
  cognitoAssert(
    password.length >= 8,
    'Password did not conform with policy: Password not long enough',
  );
  cognitoAssert(
    /[a-z]/.test(password),
    'Password did not conform with policy: Password must have lowercase characters',
  );
  cognitoAssert(
    /[A-Z]/.test(password),
    'Password did not conform with policy: Password must have uppercase characters',
  );
  cognitoAssert(
    /[0-9]/.test(password),
    'Password did not conform with policy: Password must have numeric characters',
  );
  cognitoAssert(
    /[!-/:-@[-`{-~]/.test(password),
    'Password did not conform with policy: Password must have symbol characters',
  );
}
