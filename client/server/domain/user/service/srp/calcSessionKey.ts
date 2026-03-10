import crypto from 'crypto';
import { BigInteger } from 'jsbn';
import { N, Nbytes } from './constants';
import { fromBuffer, padHex, toBufferWithLength } from './util';

export const calculateScramblingParameter = (A: string, B: string): Buffer => {
  // H(A | B)
  const ABuffer = Buffer.from(padHex(A), 'hex');
  const BBuffer = Buffer.from(padHex(B), 'hex');
  const hash = crypto.createHash('sha256').update(ABuffer).update(BBuffer).digest();
  return hash;
};

export const calculateSessionKey = (params: {
  A: string;
  B: string;
  b: string;
  v: string;
}): Buffer => {
  const Aint = new BigInteger(padHex(params.A), 16);
  const bInt = new BigInteger(padHex(params.b), 16);
  const vInt = new BigInteger(params.v, 16);

  const scramblingParameter = calculateScramblingParameter(params.A, params.B);

  // u = H(A,B) % N
  const u = vInt.modPow(fromBuffer(scramblingParameter), N);
  // S = (B - k * g^x) ^ (a + u * x) % N
  const S = Aint.multiply(u).modPow(bInt, N).mod(N);

  return toBufferWithLength(S, Nbytes);
};
