import type { FrourioSpec } from '@frourio/next';
import { z } from 'zod';

export const frourioSpec = {
  get: {
    res: {
      200: { body: z.string(), headers: z.object({ 'Content-Type': z.literal('text/html') }) },
    },
  },
} satisfies FrourioSpec;
