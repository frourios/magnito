import assert from 'assert';
import { calculateScramblingParameter } from 'domain/user/service/srp/calcSessionKey';
import { calculateSignature } from 'domain/user/service/srp/calcSignature';
import { N, Nbytes, g, multiplierParam } from 'domain/user/service/srp/constants';
import {
  calculatePrivateKey,
  fromBuffer,
  getPoolName,
  padHex,
  toBufferWithLength,
} from 'domain/user/service/srp/util';
import { BigInteger } from 'jsbn';
import { DEFAULT_USER_POOL_ID } from 'service/envValues';

export const calcClientSignature = (params: {
  A: string;
  a: BigInteger;
  B: string;
  username: string;
  password: string;
  salt: string;
  timestamp: string;
  secretBlock: string;
}): string => {
  const poolname = getPoolName(DEFAULT_USER_POOL_ID);
  const Bint = new BigInteger(padHex(params.B), 16);

  assert(Bint.compareTo(BigInteger.ZERO) > 0, 'B should be greater than 0');
  assert(Bint.compareTo(N) < 0, 'A should be less than N');

  const privateKey = calculatePrivateKey(poolname, params.username, params.password, params.salt);

  const scramblingParameter = calculateScramblingParameter(params.A, params.B);

  const S = toBufferWithLength(
    // S = (B - k * (g ^ x)) ^ (a + u * x)
    Bint.subtract(multiplierParam.multiply(g.modPow(privateKey, N)))
      .modPow(params.a.add(fromBuffer(scramblingParameter).multiply(privateKey)), N)
      .mod(N),
    Nbytes,
  );

  return calculateSignature({
    poolname,
    username: params.username,
    secretBlock: params.secretBlock,
    timestamp: params.timestamp,
    scramblingParameter,
    key: S,
  });
};
