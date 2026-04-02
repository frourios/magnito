import { ACCESS_KEY } from './serverEnvs';

export const validateSignature = (authorization: string | undefined): boolean => {
  if (!authorization) return false;

  const match = authorization.match(/Credential=([^/]+)\//);

  if (!match) return false;

  return match[1] === ACCESS_KEY;
};
