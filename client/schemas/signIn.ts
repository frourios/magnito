import { MFA_SETTING_LIST } from 'common/constants';
import { z } from 'zod';
import { brandedId } from './brandedId';

export const createTargetBodySchema = <T, U>(reqBody: z.ZodType<T>, resBody: z.ZodType<U>) => ({
  reqBody,
  resBody,
});

export type InferTargetType<T extends ReturnType<typeof createTargetBodySchema>> = {
  reqBody: z.infer<T['reqBody']>;
  resBody: z.infer<T['resBody']>;
};

export const UserSrpAuthTargetSchema = createTargetBodySchema(
  z.object({
    AuthFlow: z.literal('USER_SRP_AUTH'),
    AuthParameters: z.object({ USERNAME: z.string(), SRP_A: z.string() }),
    ClientId: brandedId.userPoolClient.maybe,
  }),
  z.object({
    ChallengeName: z.literal('PASSWORD_VERIFIER'),
    ChallengeParameters: z.object({
      SALT: z.string(),
      SECRET_BLOCK: z.string(),
      SRP_B: z.string(),
      USERNAME: z.string(),
      USER_ID_FOR_SRP: z.string(),
    }),
  }),
);

export type UserSrpAuthTarget = InferTargetType<typeof UserSrpAuthTargetSchema>;

export const RefreshTokenAuthTargetSchema = createTargetBodySchema(
  z.object({
    AuthFlow: z.literal('REFRESH_TOKEN_AUTH'),
    AuthParameters: z.object({ REFRESH_TOKEN: z.string() }),
    ClientId: brandedId.userPoolClient.maybe,
  }),
  z.object({
    AuthenticationResult: z.object({
      AccessToken: z.string(),
      ExpiresIn: z.number(),
      IdToken: z.string(),
      TokenType: z.literal('Bearer'),
    }),
    ChallengeParameters: z.record(z.string(), z.never()),
  }),
);

export type RefreshTokenAuthTarget = InferTargetType<typeof RefreshTokenAuthTargetSchema>;

export const InitiateAuthTargetSchema = createTargetBodySchema(
  UserSrpAuthTargetSchema.reqBody.or(RefreshTokenAuthTargetSchema.reqBody),
  UserSrpAuthTargetSchema.resBody.or(RefreshTokenAuthTargetSchema.resBody),
);

export type InitiateAuthTarget = InferTargetType<typeof InitiateAuthTargetSchema>;

export const RespondToAuthChallengeTargetSchema = createTargetBodySchema(
  z
    .object({
      ChallengeName: z.literal('PASSWORD_VERIFIER'),
      ChallengeResponses: z.object({
        PASSWORD_CLAIM_SECRET_BLOCK: z.string(),
        PASSWORD_CLAIM_SIGNATURE: z.string(),
        TIMESTAMP: z.string(),
        USERNAME: z.string(),
      }),
      ClientId: brandedId.userPoolClient.maybe,
      Session: z.undefined().optional(),
    })
    .or(
      z.object({
        ChallengeName: z.literal('SOFTWARE_TOKEN_MFA'),
        ChallengeResponses: z.object({ SOFTWARE_TOKEN_MFA_CODE: z.string(), USERNAME: z.string() }),
        ClientId: brandedId.userPoolClient.maybe,
        Session: z.string(),
      }),
    ),
  z
    .object({
      AuthenticationResult: z.object({
        AccessToken: z.string(),
        ExpiresIn: z.number(),
        IdToken: z.string(),
        RefreshToken: z.string(),
        TokenType: z.literal('Bearer'),
      }),
      ChallengeName: z.undefined().optional(),
      Session: z.undefined().optional(),
      ChallengeParameters: z.record(z.string(), z.never()),
    })
    .or(
      z.object({
        AuthenticationResult: z.undefined().optional(),
        ChallengeName: z.enum(MFA_SETTING_LIST),
        Session: z.string(),
        ChallengeParameters: z.record(z.string(), z.never()),
      }),
    ),
);

export type RespondToAuthChallengeTarget = InferTargetType<
  typeof RespondToAuthChallengeTargetSchema
>;
