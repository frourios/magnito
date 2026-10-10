import type { FrourioSpec } from '@frourio/vinext';
import { z } from 'zod';
import {
  COOKIE_NAME,
  COOKIE_OPTIONS,
  SOCIAL_FLOW_COOKIE_NAME,
} from '../../../../../server/service/constants';

export const frourioSpec = {
  get: {
    query: z.object({ code: z.string().optional(), state: z.string().optional() }),
    headers: z.object({ cookie: z.string().optional() }),
    res: {
      302: {
        cookies: {
          [COOKIE_NAME]: { command: 'set', value: z.string(), options: COOKIE_OPTIONS },
          [SOCIAL_FLOW_COOKIE_NAME]: { command: 'delete' },
        },
        headers: z.object({ Location: z.string() }),
      },
      400: { cookies: { [SOCIAL_FLOW_COOKIE_NAME]: { command: 'delete' } } },
    },
  },
} satisfies FrourioSpec;
