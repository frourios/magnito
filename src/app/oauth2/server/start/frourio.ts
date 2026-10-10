import type { FrourioSpec } from '@frourio/vinext';
import { z } from 'zod';
import {
  SOCIAL_FLOW_COOKIE_NAME,
  SOCIAL_FLOW_COOKIE_OPTIONS,
} from '../../../../../server/service/constants';
import { PROVIDER_LIST } from '../../../../schemas/constants';

export const frourioSpec = {
  get: {
    query: z.object({ provider: z.enum(PROVIDER_LIST).optional().catch(undefined) }),
    res: {
      302: {
        cookies: {
          [SOCIAL_FLOW_COOKIE_NAME]: {
            command: 'set',
            value: z.string(),
            options: SOCIAL_FLOW_COOKIE_OPTIONS,
          },
        },
        headers: z.object({ Location: z.string() }),
      },
      400: {},
    },
  },
} satisfies FrourioSpec;
