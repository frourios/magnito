import crypto from 'crypto';
import type { DtoId } from 'src/schemas/brandedId';
import { g, N, Nbytes } from './srp/constants';
import { calculatePrivateKey, getPoolName, toBufferWithLength } from './srp/util';

export const genVerifier = (params: {
  poolId: DtoId['userPool'];
  username: string;
  password: string;
  salt: string;
}): string => {
  // extract pool name from poolId (poolId format: userPoolId_poolName)
  const poolName = getPoolName(params.poolId);
  const privateKey = calculatePrivateKey(poolName, params.username, params.password, params.salt);
  // verifier = g ^ privateKey % N
  const verifier = toBufferWithLength(g.modPow(privateKey, N), Nbytes).toString('hex');
  return verifier;
};

export const genCredentials = (params: {
  poolId: DtoId['userPool'];
  username: string;
  password: string;
}): { salt: string; verifier: string } => {
  const salt = crypto.randomBytes(16).toString('hex');
  const verifier = genVerifier({ ...params, salt });
  return { salt, verifier };
};
