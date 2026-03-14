import { z } from 'zod';
import { brandedId } from './brandedId';

export const DefaultsDtoSchema = z.object({
  userPoolId: brandedId.userPool.dto,
  userPoolClientId: brandedId.userPoolClient.dto,
  region: z.string(),
  accessKey: z.string(),
  secretKey: z.string(),
  oauthDomain: z.string(),
});

export type DefaultsDto = z.infer<typeof DefaultsDtoSchema>;
