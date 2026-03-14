import assert from 'assert';

export const COGNITO_ERRORS = {
  'Incorrect username or password.': 'NotAuthorizedException',
  'Invalid email address format.': 'InvalidParameterException',
  "1 validation error detected: Value at 'username' failed to satisfy constraint: Member must satisfy regular expression pattern: [\\p{L}\\p{M}\\p{S}\\p{N}\\p{P}]+":
    'InvalidParameterException',
  'Password did not conform with policy: Password must have lowercase characters':
    'InvalidPasswordException',
  'Password did not conform with policy: Password must have uppercase characters':
    'InvalidPasswordException',
  'Password did not conform with policy: Password must have numeric characters':
    'InvalidPasswordException',
  'Password did not conform with policy: Password must have symbol characters':
    'InvalidPasswordException',
  'Password did not conform with policy: Password not long enough': 'InvalidPasswordException',
  'User already exists': 'UsernameExistsException',
  'Invalid verification code provided, please try again.': 'CodeMismatchException',
  'User is not confirmed.': 'UserNotConfirmedException',
};

export class CognitoError extends Error {}

export function cognitoAssert(val: unknown, msg: keyof typeof COGNITO_ERRORS): asserts val {
  assert(val, new CognitoError(msg));
}
