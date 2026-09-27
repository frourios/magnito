import type { FrourioSpec } from '@frourio/vinext';
import { z } from 'zod';
import { PROVIDER_LIST } from '../../../../schemas/constants';

export const frourioSpec = {
  get: {
    query: z.object({ provider: z.enum(PROVIDER_LIST).optional().catch(undefined) }),
  },
} satisfies FrourioSpec;
