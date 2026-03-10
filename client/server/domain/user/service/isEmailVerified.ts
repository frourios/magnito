import type { CognitoUserEntity } from 'common/types/user';

export const isEmailVerified = (user: CognitoUserEntity): boolean =>
  user.status === 'CONFIRMED' || user.status === 'FORCE_CHANGE_PASSWORD';
