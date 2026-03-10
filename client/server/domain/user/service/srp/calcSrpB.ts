import crypto from 'crypto';
import { BigInteger } from 'jsbn';
import { N, g, multiplierParam } from './constants';
import { fromBuffer, toBuffer } from './util';

export const calculateSrpB = (
  v: string,
): {
  b: string;
  B: string;
} => {
  let BInt = BigInteger.ZERO;
  let b = Buffer.from([0]);
  const vInt = new BigInteger(v, 16);

  while (BInt === BigInteger.ZERO) {
    b = crypto.randomBytes(32);
    const bInt = fromBuffer(b);
    BInt = multiplierParam.multiply(vInt).add(g.modPow(bInt, N)).mod(N);
  }

  // kv + g^b
  const B = toBuffer(BInt);
  return { b: b.toString('hex'), B: B.toString('hex') };
};
