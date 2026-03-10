import type { CognitoUserEntity } from 'common/types/user';
import { sendMail } from 'service/sendMail';

export const sendConfirmationCode = (user: CognitoUserEntity): Promise<void> =>
  sendMail({
    to: { name: user.name, address: user.email },
    subject: 'Your verification code',
    text: `Your confirmation code is ${user.confirmationCode}`,
  });

export const sendTemporaryPassword = (user: CognitoUserEntity): Promise<void> =>
  sendMail({
    to: { name: user.name, address: user.email },
    subject: 'Your temporary password',
    text: `Your temporary password is ${user.password}`,
  });
