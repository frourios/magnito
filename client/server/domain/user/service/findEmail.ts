import assert from 'assert';
import type { AttributeType } from '@aws-sdk/client-cognito-identity-provider';

export const findEmail = (attributes: AttributeType[] | undefined): string => {
  const email = attributes?.find((attr) => attr.Name === 'email')?.Value;
  assert(email);

  return email;
};
