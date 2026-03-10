import { z } from 'zod';
import { brandedId } from './brandedId';

export const JwksDtoSchema = z.object({
  keys: z.array(z.object({ kid: z.string(), alg: z.string() })),
});

export type JwksDto = z.infer<typeof JwksDtoSchema>;

export const UserPoolDtoSchema = z.object({
  id: brandedId.userPool.dto,
  name: z.string(),
  privateKey: z.string(),
  createdTime: z.number(),
});

export type UserPoolDto = z.infer<typeof UserPoolDtoSchema>;

export const UserPoolClientDtoSchema = z.object({
  id: brandedId.userPoolClient.dto,
  userPoolId: brandedId.userPool.dto,
  name: z.string(),
  createdTime: z.number(),
});

export type UserPoolClientDto = z.infer<typeof UserPoolClientDtoSchema>;
