import { Buffer } from 'buffer';
import crypto from 'crypto';
import { BigInteger } from 'jsbn';
import { N, g } from './constants';
import { fromBuffer, toBuffer } from './util';

export const calculateSrpA = (): { a: Buffer; A: Buffer } => {
  let a: Buffer = Buffer.from([0]);
  let AInt = BigInteger.ZERO;
  while (AInt === BigInteger.ZERO) {
    a = crypto.randomBytes(32);
    AInt = g.modPow(fromBuffer(a), N);
  }
  return { a, A: toBuffer(AInt) };
};
