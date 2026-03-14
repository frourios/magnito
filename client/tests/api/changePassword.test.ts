import assert from 'assert';
import { calcClientSignature } from 'server/domain/user/service/srp/calcClientSignature';
import { calculateSrpA } from 'server/domain/user/service/srp/calcSrpA';
import { fromBuffer } from 'server/domain/user/service/srp/util';
import { DEFAULT_USER_POOL_CLIENT_ID } from 'server/service/serverEnvs';
import { test } from 'vitest';
import { noCookieClient, testPassword, testUserName } from './apiClient';
import { createCognitoUserAndToken } from './utils';

test('changePassword', async () => {
  await createCognitoUserAndToken();

  const { a, A } = calculateSrpA();
  const res1 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: {
      AuthFlow: 'USER_SRP_AUTH',
      AuthParameters: { USERNAME: testUserName, SRP_A: A.toString('hex') },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('ChallengeParameters' in res1);
  assert(res1.ChallengeParameters);
  const secretBlock1 = res1.ChallengeParameters.SECRET_BLOCK;
  const signature1 = calcClientSignature({
    secretBlock: secretBlock1,
    username: testUserName,
    password: testPassword,
    salt: res1.ChallengeParameters.SALT,
    timestamp: 'Thu Jan 01 00:00:00 UTC 1970',
    A: A.toString('hex'),
    a: fromBuffer(a),
    B: res1.ChallengeParameters.SRP_B,
  });

  const res2 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge' },
    body: {
      ChallengeName: 'PASSWORD_VERIFIER',
      ChallengeResponses: {
        PASSWORD_CLAIM_SECRET_BLOCK: secretBlock1,
        PASSWORD_CLAIM_SIGNATURE: signature1,
        TIMESTAMP: 'Thu Jan 01 00:00:00 UTC 1970',
        USERNAME: testUserName,
      },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('AuthenticationResult' in res2);
  assert(res2.AuthenticationResult);
  assert(res2.AuthenticationResult.AccessToken);
  assert('RefreshToken' in res2.AuthenticationResult);

  const newPassword = 'Test-client-password2';

  await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.ChangePassword' },
    body: {
      AccessToken: res2.AuthenticationResult.AccessToken,
      PreviousPassword: testPassword,
      ProposedPassword: newPassword,
    },
  });

  const res3 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: {
      AuthFlow: 'USER_SRP_AUTH',
      AuthParameters: { USERNAME: testUserName, SRP_A: A.toString('hex') },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('ChallengeParameters' in res3);
  assert(res3.ChallengeParameters);
  const secretBlock2 = res3.ChallengeParameters.SECRET_BLOCK;
  const signature2 = calcClientSignature({
    secretBlock: secretBlock2,
    username: testUserName,
    password: newPassword,
    salt: res3.ChallengeParameters.SALT,
    timestamp: 'Thu Jan 01 00:00:00 UTC 1970',
    A: A.toString('hex'),
    a: fromBuffer(a),
    B: res3.ChallengeParameters.SRP_B,
  });

  const res4 = await noCookieClient.$post({
    headers: { 'x-amz-target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge' },
    body: {
      ChallengeName: 'PASSWORD_VERIFIER',
      ChallengeResponses: {
        PASSWORD_CLAIM_SECRET_BLOCK: secretBlock2,
        PASSWORD_CLAIM_SIGNATURE: signature2,
        TIMESTAMP: 'Thu Jan 01 00:00:00 UTC 1970',
        USERNAME: testUserName,
      },
      ClientId: DEFAULT_USER_POOL_CLIENT_ID,
    },
  });

  assert('AuthenticationResult' in res4);
  assert(res4.AuthenticationResult);
  assert('RefreshToken' in res4.AuthenticationResult);
}, 10000);
