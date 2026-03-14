import { brandedId } from 'schemas/brandedId';
import { z } from 'zod';

const IdTokenJwtSchema = z.object({
  sub: brandedId.cognitoUser.maybe.or(brandedId.socialUser.maybe),
  email_verified: z.boolean(),
  iss: z.string(),
  'cognito:username': z.string(),
  origin_jti: z.string(),
  aud: brandedId.userPoolClient.maybe,
  event_id: z.string(),
  token_use: z.literal('id'),
  auth_time: z.number(),
  exp: z.number(),
  iat: z.number(),
  jti: z.string(),
  email: z.string().email(),
});

export type IdTokenJwt = z.infer<typeof IdTokenJwtSchema>;

const AccessTokenJwtSchema = z.object({
  sub: brandedId.cognitoUser.maybe.or(brandedId.socialUser.maybe),
  iss: z.string(),
  client_id: brandedId.userPoolClient.maybe,
  origin_jti: z.string(),
  event_id: z.string(),
  token_use: z.literal('access'),
  scope: z.literal('aws.cognito.signin.user.admin'),
  auth_time: z.number(),
  exp: z.number(),
  iat: z.number(),
  jti: z.string(),
  username: z.string(),
});

export type AccessTokenJwt = z.infer<typeof AccessTokenJwtSchema>;

export const TokenJwtSchema = IdTokenJwtSchema.or(AccessTokenJwtSchema);

export type TokenJwt = z.infer<typeof TokenJwtSchema>;
