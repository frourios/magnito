import { createSigner } from 'fast-jwt';
import type { DtoId } from 'schemas/brandedId';
import type { UserDto } from 'schemas/user';
import type { JwksDto } from 'schemas/userPool';
import { EXPIRES_SEC } from 'server/service/constants';
import { SERVER_PORT } from 'server/service/serverEnvs';
import type { AccessTokenJwt, IdTokenJwt } from 'server/service/types';
import { ulid } from 'ulid';
import { isEmailVerified } from './isEmailVerified';

export const genTokens = (params: {
  privateKey: string;
  userPoolClientId: DtoId['userPoolClient'];
  jwks: JwksDto;
  user: UserDto;
}): { AccessToken: string; IdToken: string } => {
  const signer = createSigner({
    key: params.privateKey,
    aud: params.userPoolClientId,
    header: { kid: params.jwks.keys[0].kid, alg: params.jwks.keys[0].alg },
  });
  const now = Math.floor(Date.now() / 1000);
  const common = {
    sub: params.user.id,
    iss: `http://localhost:${SERVER_PORT}/${params.user.userPoolId}`,
    origin_jti: ulid(),
    event_id: ulid(),
    auth_time: now,
    exp: now + EXPIRES_SEC,
    iat: now,
    jti: ulid(),
  };

  const accessToken: AccessTokenJwt = {
    ...common,
    client_id: params.userPoolClientId,
    token_use: 'access',
    scope: 'aws.cognito.signin.user.admin',
    username: params.user.name,
  };
  const idToken: IdTokenJwt = {
    ...common,
    email_verified: params.user.kind === 'cognito' && isEmailVerified(params.user),
    'cognito:username': params.user.name,
    aud: params.userPoolClientId,
    token_use: 'id',
    email: params.user.email,
  };

  return { AccessToken: signer(accessToken), IdToken: signer(idToken) };
};
