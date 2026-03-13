import type { FrourioSpec } from '@frourio/next';
import { SocialUserRequestTokensValSchema, SocialUserResponseTokensValSchema } from 'schemas/user';

export const frourioSpec = {
  post: {
    format: 'urlencoded',
    body: SocialUserRequestTokensValSchema,
    res: { 200: { body: SocialUserResponseTokensValSchema } },
  },
} satisfies FrourioSpec;
