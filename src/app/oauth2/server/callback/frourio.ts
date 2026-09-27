import type { FrourioSpec } from '@frourio/vinext';
import { z } from 'zod';

export const frourioSpec = {
  get: {
    query: z.object({ code: z.string().optional(), state: z.string().optional() }),
    headers: z.object({ cookie: z.string().optional() }),
  },
} satisfies FrourioSpec;
