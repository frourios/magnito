import assert from 'assert';
import crypto from 'crypto';
import type { UserSrpAuthTarget } from 'common/types/signIn';
import type { ChallengeVal, CognitoUserEntity } from 'common/types/user';
import type { Jwks, UserPoolClientEntity, UserPoolEntity } from 'common/types/userPool';
import { genTokens } from 'domain/user/service/genTokens';
import {
  calculateScramblingParameter,
  calculateSessionKey,
} from 'domain/user/service/srp/calcSessionKey';
import { calculateSignature } from 'domain/user/service/srp/calcSignature';
import { calculateSrpB } from 'domain/user/service/srp/calcSrpB';
import { getPoolName } from 'domain/user/service/srp/util';
import { cognitoAssert } from 'service/cognitoAssert';

export const signInMethod = {
  createChallenge: (
    user: CognitoUserEntity,
    params: UserSrpAuthTarget['reqBody']['AuthParameters'],
  ): {
    userWithChallenge: CognitoUserEntity;
    ChallengeParameters: UserSrpAuthTarget['resBody']['ChallengeParameters'];
  } => {
    const { B, b } = calculateSrpB(user.verifier);
    const secretBlock = crypto.randomBytes(64).toString('base64');
    const challenge: ChallengeVal = { pubB: B, secB: b, pubA: params.SRP_A, secretBlock };

    return {
      userWithChallenge: { ...user, challenge },
      ChallengeParameters: {
        SALT: user.salt,
        SECRET_BLOCK: secretBlock,
        SRP_B: B,
        USERNAME: user.name,
        USER_ID_FOR_SRP: user.name,
      },
    };
  },
  srpAuth: (params: {
    user: CognitoUserEntity;
    timestamp: string;
    clientSignature: string;
    jwks: Jwks;
    pool: UserPoolEntity;
    poolClient: UserPoolClientEntity;
  }): { AccessToken: string; IdToken: string } => {
    assert(params.user.challenge);
    const { pubA: A, pubB: B, secB: b } = params.user.challenge;
    const poolname = getPoolName(params.user.userPoolId);
    const scramblingParameter = calculateScramblingParameter(A, B);
    const sessionKey = calculateSessionKey({ A, B, b, v: params.user.verifier });
    const signature = calculateSignature({
      poolname,
      username: params.user.name,
      secretBlock: params.user.challenge.secretBlock,
      timestamp: params.timestamp,
      scramblingParameter,
      key: sessionKey,
    });
    cognitoAssert(signature === params.clientSignature, 'Incorrect username or password.');

    return genTokens({
      privateKey: params.pool.privateKey,
      userPoolClientId: params.poolClient.id,
      jwks: params.jwks,
      user: params.user,
    });
  },
  challengeMfa: (
    user: CognitoUserEntity,
    srpAuth: { timestamp: string; clientSignature: string },
  ): CognitoUserEntity => ({ ...user, srpAuth }),
};
