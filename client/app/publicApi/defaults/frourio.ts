import type { FrourioSpec } from '@frourio/next';
import { DefaultsDtoSchema } from 'schemas/defaults';

export const frourioSpec = {
  get: {
    res: { 200: { body: DefaultsDtoSchema } },
  },
} satisfies FrourioSpec;
