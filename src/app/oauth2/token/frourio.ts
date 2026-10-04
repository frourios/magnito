import type { FrourioSpec } from '@frourio/vinext';
import { z } from 'zod';
import {
  SocialUserRequestTokensValSchema,
  SocialUserResponseTokensValSchema,
} from '../../../schemas/user';

export const frourioSpec = {
  post: {
    format: 'urlencoded',
    headers: z.object({ authorization: z.string().optional() }).optional(),
    body: SocialUserRequestTokensValSchema.extend({
      client_id: SocialUserRequestTokensValSchema.shape.client_id.optional(),
      client_secret: z.string().optional(),
    }),
    res: {
      200: { body: SocialUserResponseTokensValSchema },
      401: { body: z.object({ error: z.literal('invalid_client') }) },
    },
  },
} satisfies FrourioSpec;
