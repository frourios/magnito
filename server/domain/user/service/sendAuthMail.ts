import { sendMail } from 'server/service/sendMail';
import type { CognitoUserDto } from 'src/schemas/user';
import type { CognitoUserEntity } from '../model/userType';

export const sendConfirmationCode = (user: CognitoUserEntity | CognitoUserDto): Promise<void> =>
  sendMail({
    to: { name: user.name, address: user.email },
    subject: 'Your verification code',
    text: `Your confirmation code is ${user.confirmationCode}`,
  });

export const sendTemporaryPassword = (user: CognitoUserEntity | CognitoUserDto): Promise<void> =>
  sendMail({
    to: { name: user.name, address: user.email },
    subject: 'Your temporary password',
    text: `Your temporary password is ${user.password}`,
  });
