import type { FrourioSpec } from '@frourio/next';
import { brandedId } from 'src/schemas/brandedId';
import { SocialUserCreateValSchema, SocialUserDtoSchema } from 'src/schemas/user';
import { z } from 'zod';

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
