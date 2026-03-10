import type { CodeDeliveryDetailsType } from '@aws-sdk/client-cognito-identity-provider';
import type { UserEntity } from 'common/types/user';

export const genCodeDeliveryDetails = (user: UserEntity): CodeDeliveryDetailsType => ({
  AttributeName: 'email',
  DeliveryMedium: 'EMAIL',
  Destination: user.email.replace(/^(.).*@(.).+$/, '$1***@$2***'),
});
