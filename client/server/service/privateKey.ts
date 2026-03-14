import { createHash, createPublicKey, generateKeyPairSync } from 'crypto';
import { JWK } from 'node-jose';
import { JwksDtoSchema, type JwksDto } from 'schemas/userPool';

export const genPrivatekey = (): string => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return privateKey;
};

export const genJwks = async (privateKey: string): Promise<JwksDto> => {
  const keystore = JWK.createKeyStore();
  const publicKey = createPublicKey(privateKey);
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const kid = createHash('sha256').update(publicKeyPem).digest('base64url');

  await keystore.add(publicKeyPem, 'pem', { alg: 'RS256', use: 'sig', kid });

  return JwksDtoSchema.parse(keystore.toJSON());
};
