import type { EntityId } from 'common/types/brandedId';
import type { UserEntity } from 'common/types/user';
import type { Jwks } from 'common/types/userPool';
import { createSigner } from 'fast-jwt';
import { EXPIRES_SEC } from 'service/constants';
import { PORT } from 'service/envValues';
import type { AccessTokenJwt, IdTokenJwt } from 'service/types';
import { ulid } from 'ulid';
import { isEmailVerified } from './isEmailVerified';

export const genTokens = (params: {
  privateKey: string;
  userPoolClientId: EntityId['userPoolClient'];
  jwks: Jwks;
  user: UserEntity;
}): { AccessToken: string; IdToken: string } => {
  const signer = createSigner({
    key: params.privateKey,
    aud: params.userPoolClientId,
    header: { kid: params.jwks.keys[0].kid, alg: params.jwks.keys[0].alg },
  });
  const now = Math.floor(Date.now() / 1000);
  const common = {
    sub: params.user.id,
    iss: `http://localhost:${PORT}/${params.user.userPoolId}`,
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
