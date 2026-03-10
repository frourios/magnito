export const genConfirmationCode = (): string => {
  const min = 100000;
  const max = 999999;
  const verificationCode = Math.floor(Math.random() * (max - min + 1)) + min;
  return verificationCode.toString();
};
