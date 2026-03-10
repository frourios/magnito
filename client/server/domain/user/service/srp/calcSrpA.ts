import { Buffer } from 'buffer';
import crypto from 'crypto';
import { N, g } from 'domain/user/service/srp/constants';
import { fromBuffer, toBuffer } from 'domain/user/service/srp/util';
import { BigInteger } from 'jsbn';

export const calculateSrpA = (): { a: Buffer; A: Buffer } => {
  let a = Buffer.from([0]);
  let AInt = BigInteger.ZERO;
  while (AInt === BigInteger.ZERO) {
    a = crypto.randomBytes(32);
    AInt = g.modPow(fromBuffer(a), N);
  }
  return { a, A: toBuffer(AInt) };
};
