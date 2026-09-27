import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export const hashPasswordForHistory = (password: string): string => {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(password, salt, 32).toString('hex')}`;
};

export const matchesPasswordHistory = (password: string, entry: string): boolean => {
  const [salt, hash] = entry.split(':');
  return timingSafeEqual(
    scryptSync(password, Buffer.from(salt, 'hex'), 32),
    Buffer.from(hash, 'hex'),
  );
};
