import type { CodeDeliveryDetailsType } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoUserDto } from 'src/schemas/user';
import type { UserEntity } from '../model/userType';

export const genCodeDeliveryDetails = (
  user: UserEntity | CognitoUserDto,
): CodeDeliveryDetailsType => ({
  AttributeName: 'email',
  DeliveryMedium: 'EMAIL',
  Destination: user.email.replace(/^(.).*@(.).+$/, '$1***@$2***'),
});
