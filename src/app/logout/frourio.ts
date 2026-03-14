import type { FrourioSpec } from '@frourio/next';
import { brandedId } from 'src/schemas/brandedId';
import { z } from 'zod';

export const frourioSpec = {
  get: {
    query: z.object({ client_id: brandedId.userPoolClient.maybe, logout_uri: z.string().url() }),
  },
} satisfies FrourioSpec;
