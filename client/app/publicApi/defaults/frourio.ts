import type { FrourioSpec } from '@frourio/next';
import { brandedId } from 'schemas/brandedId';
import { z } from 'zod';

export const frourioSpec = {
  get: {
    res: {
      200: {
        body: z.object({
          userPoolId: brandedId.userPool.dto,
          userPoolClientId: brandedId.userPoolClient.dto,
          region: z.string(),
          accessKey: z.string(),
          secretKey: z.string(),
          oauthDomain: z.string(),
        }),
      },
    },
  },
} satisfies FrourioSpec;
