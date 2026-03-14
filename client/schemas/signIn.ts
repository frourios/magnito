import type { MFA_SETTING_LIST } from 'schemas/constants';
import type { MaybeId } from './brandedId';

export type TargetBody<Req, Res> = { reqBody: Req; resBody: Res };

export type UserSrpAuthTarget = TargetBody<
  {
    AuthFlow: 'USER_SRP_AUTH';
    AuthParameters: { USERNAME: string; SRP_A: string };
    ClientId: MaybeId['userPoolClient'];
  },
  {
    ChallengeName: 'PASSWORD_VERIFIER';
    ChallengeParameters: {
      SALT: string;
      SECRET_BLOCK: string;
      SRP_B: string;
      USERNAME: string;
      USER_ID_FOR_SRP: string;
    };
  }
>;

export type RefreshTokenAuthTarget = TargetBody<
  {
    AuthFlow: 'REFRESH_TOKEN_AUTH';
    AuthParameters: { REFRESH_TOKEN: string };
    ClientId: MaybeId['userPoolClient'];
  },
  {
    AuthenticationResult: {
      AccessToken: string;
      ExpiresIn: number;
      IdToken: string;
      TokenType: 'Bearer';
    };
    ChallengeParameters: Record<string, never>;
  }
>;

export type InitiateAuthTarget = UserSrpAuthTarget | RefreshTokenAuthTarget;

export type RespondToAuthChallengeTarget = TargetBody<
  | {
      ChallengeName: 'PASSWORD_VERIFIER';
      ChallengeResponses: {
        PASSWORD_CLAIM_SECRET_BLOCK: string;
        PASSWORD_CLAIM_SIGNATURE: string;
        TIMESTAMP: string;
        USERNAME: string;
      };
      ClientId: MaybeId['userPoolClient'];
      Session?: undefined;
    }
  | {
      ChallengeName: 'SOFTWARE_TOKEN_MFA';
      ChallengeResponses: { SOFTWARE_TOKEN_MFA_CODE: string; USERNAME: string };
      ClientId: MaybeId['userPoolClient'];
      Session: string;
    },
  | {
      AuthenticationResult: {
        AccessToken: string;
        ExpiresIn: number;
        IdToken: string;
        RefreshToken: string;
        TokenType: 'Bearer';
      };
      ChallengeName?: undefined;
      Session?: undefined;
      ChallengeParameters: Record<string, never>;
    }
  | {
      AuthenticationResult?: undefined;
      ChallengeName: (typeof MFA_SETTING_LIST)[number];
      Session: string;
      ChallengeParameters: Record<string, never>;
    }
>;
