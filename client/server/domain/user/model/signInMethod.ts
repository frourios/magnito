import assert from 'assert';
import crypto from 'crypto';
import { brandedId } from 'schemas/brandedId';
import type { UserSrpAuthTarget } from 'schemas/signIn';
import type { ChallengeVal, CognitoUserDto } from 'schemas/user';
import type { JwksDto, UserPoolClientDto, UserPoolDto } from 'schemas/userPool';
import { cognitoAssert } from 'server/service/cognitoAssert';
import { genTokens } from '../service/genTokens';
import { calculateScramblingParameter, calculateSessionKey } from '../service/srp/calcSessionKey';
import { calculateSignature } from '../service/srp/calcSignature';
import { calculateSrpB } from '../service/srp/calcSrpB';
import { getPoolName } from '../service/srp/util';
import type { CognitoUserEntity } from './userType';

export const signInMethod = {
  createChallenge: (
    user: CognitoUserDto,
    params: UserSrpAuthTarget['reqBody']['AuthParameters'],
  ): {
    userWithChallenge: CognitoUserEntity;
    ChallengeParameters: UserSrpAuthTarget['resBody']['ChallengeParameters'];
  } => {
    const { B, b } = calculateSrpB(user.verifier);
    const secretBlock = crypto.randomBytes(64).toString('base64');
    const challenge: ChallengeVal = { pubB: B, secB: b, pubA: params.SRP_A, secretBlock };

    return {
      userWithChallenge: {
        ...user,
        id: brandedId.cognitoUser.entity.parse(user.id),
        attributes: user.attributes.map((attr) => ({
          ...attr,
          id: brandedId.userAttribute.entity.parse(attr.id),
        })),
        userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
        challenge,
      },
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
    user: CognitoUserDto;
    timestamp: string;
    clientSignature: string;
    jwks: JwksDto;
    pool: UserPoolDto;
    poolClient: UserPoolClientDto;
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
    user: CognitoUserDto,
    srpAuth: { timestamp: string; clientSignature: string },
  ): CognitoUserEntity => ({
    ...user,
    id: brandedId.cognitoUser.entity.parse(user.id),
    attributes: user.attributes.map((attr) => ({
      ...attr,
      id: brandedId.userAttribute.entity.parse(attr.id),
    })),
    userPoolId: brandedId.userPool.entity.parse(user.userPoolId),
    srpAuth,
  }),
};
