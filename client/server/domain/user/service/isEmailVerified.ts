import type { CognitoUserDto } from 'schemas/user';
import type { CognitoUserEntity } from '../model/userType';

export const isEmailVerified = (user: CognitoUserDto | CognitoUserEntity): boolean =>
  user.status === 'CONFIRMED' || user.status === 'FORCE_CHANGE_PASSWORD';
