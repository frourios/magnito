import type { FrourioSpec } from '@frourio/next';
import { z } from 'zod';
import { brandedId } from '../../../schemas/brandedId';
import { SocialUserCreateValSchema, SocialUserDtoSchema } from '../../../schemas/user';

export const frourioSpec = {
  get: {
    query: z.object({ userPoolClientId: brandedId.userPoolClient.maybe }),
    res: { 200: { body: z.array(SocialUserDtoSchema) } },
  },
  post: {
    body: SocialUserCreateValSchema,
    res: { 200: { body: SocialUserDtoSchema } },
  },
  patch: {
    body: z.object({ id: brandedId.socialUser.maybe, codeChallenge: z.string() }),
    res: { 200: { body: SocialUserDtoSchema } },
  },
} satisfies FrourioSpec;
