import { createVerifier } from 'fast-jwt';
import buildGetJwks from 'get-jwks';
import type { DtoId } from 'schemas/brandedId';
import type { IdTokenJwt, JwtUser } from 'schemas/jwt';
import { JwtUserSchema } from 'schemas/jwt';
import { z } from 'zod';
import { CLIENT_PORT } from './serverEnvs';

const getJwks = buildGetJwks();

export async function parseJwtUser(
  idToken: IdTokenJwt,
  poolInfo: { userPoolId: DtoId['userPool']; poolClientIds: DtoId['userPoolClient'][] },
): Promise<JwtUser | null> {
  if (idToken.exp * 1000 <= Date.now()) return null;

  const verifyWithPromise = createVerifier({
    async key(val: unknown) {
      const jwt = z
        .object({
          header: z.object({ kid: z.string(), alg: z.string() }),
          payload: z.object({ aud: z.string() }),
        })
        .parse(val);
      const publicKey = await getJwks.getPublicKey({
        kid: jwt.header.kid,
        alg: jwt.header.alg,
        domain: `http://localhost:${CLIENT_PORT}/${poolInfo.userPoolId}`,
      });

      return publicKey;
    },
    allowedAud: poolInfo.poolClientIds,
  });

  return await verifyWithPromise(idToken.sub).then((val) => JwtUserSchema.parse(val));
}
