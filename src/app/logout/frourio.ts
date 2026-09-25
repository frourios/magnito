import type { FrourioSpec } from '@frourio/next';
import { z } from 'zod';
import { brandedId } from '../../schemas/brandedId';

export const frourioSpec = {
  get: {
    query: z.object({ client_id: brandedId.userPoolClient.maybe, logout_uri: z.string().url() }),
  },
} satisfies FrourioSpec;
