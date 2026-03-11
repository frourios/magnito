import type { DtoId } from 'schemas/brandedId';
import type { UserDto } from 'schemas/user';

export type IdTokenJwt = {
  sub: UserDto['id'];
  email_verified: boolean;
  iss: string;
  'cognito:username': string;
  origin_jti: string;
  aud: DtoId['userPoolClient'];
  event_id: string;
  token_use: 'id';
  auth_time: number;
  exp: number;
  iat: number;
  jti: string;
  email: string;
};

export type AccessTokenJwt = {
  sub: UserDto['id'];
  iss: string;
  client_id: DtoId['userPoolClient'];
  origin_jti: string;
  event_id: string;
  token_use: 'access';
  scope: 'aws.cognito.signin.user.admin';
  auth_time: number;
  exp: number;
  iat: number;
  jti: string;
  username: string;
};
