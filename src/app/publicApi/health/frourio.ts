import type { FrourioSpec } from '@frourio/vinext';
import { z } from 'zod';

export const frourioSpec = {
  get: { res: { 200: { body: z.literal('ok') } } },
} satisfies FrourioSpec;
