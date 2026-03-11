import type { FrourioSpec } from '@frourio/next';
import { z } from 'zod';

export const frourioSpec = {
  middleware: true,
  post: {
    body: z.object({ jwt: z.string() }),
    res: { 200: { body: z.object({ status: z.literal('success') }) } },
  },
  delete: {
    res: { 200: { body: z.object({ status: z.literal('success') }) } },
  },
} satisfies FrourioSpec;
