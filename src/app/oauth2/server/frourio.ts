import type { FrourioSpec } from '@frourio/vinext';
import { z } from 'zod';

export const frourioSpec = {
  middleware: { context: z.object({ requestOrigin: z.string() }) },
} satisfies FrourioSpec;
