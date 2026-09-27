import { createHash, randomBytes } from 'crypto';
import { createSigner, createVerifier } from 'fast-jwt';
import { z } from 'zod';

const flowSchema = z.object({ state: z.string(), verifier: z.string() });

const hmacKey = (privateKey: string): string =>
  createHash('sha256').update(privateKey).digest('hex');

export const createSocialOAuthFlow = (
  privateKey: string,
): {
  state: string;
  challenge: string;
  cookie: string;
} => {
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');

  return {
    state,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
    cookie: createSigner({ key: hmacKey(privateKey), expiresIn: 300_000 })({ state, verifier }),
  };
};

export const readSocialOAuthFlow = (
  cookie: string | undefined,
  privateKey: string,
): z.infer<typeof flowSchema> | null => {
  if (!cookie) return null;

  return (
    flowSchema.safeParse(
      createVerifier({ key: hmacKey(privateKey), algorithms: ['HS256'] })(cookie),
    ).data ?? null
  );
};
