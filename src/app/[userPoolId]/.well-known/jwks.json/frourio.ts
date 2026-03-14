import type { FrourioSpec } from '@frourio/next';
import { JwksDtoSchema } from 'src/schemas/userPool';

export const frourioSpec = {
  get: {
    res: { 200: { body: JwksDtoSchema } },
  },
} satisfies FrourioSpec;
