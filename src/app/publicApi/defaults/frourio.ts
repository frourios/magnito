import type { FrourioSpec } from '@frourio/vinext';
import { DefaultsDtoSchema } from '../../../schemas/defaults';

export const frourioSpec = {
  get: {
    res: { 200: { body: DefaultsDtoSchema } },
  },
} satisfies FrourioSpec;
