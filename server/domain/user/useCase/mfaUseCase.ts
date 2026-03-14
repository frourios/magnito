import { VerifySoftwareTokenResponseType } from '@aws-sdk/client-cognito-identity-provider';
import { createDecoder } from 'fast-jwt';
import { customAssert } from 'server/service/customAssert';
import { transaction } from 'server/service/transaction';
import type {
  AssociateSoftwareTokenTarget,
  SetUserMFAPreferenceTarget,
  VerifySoftwareTokenTarget,
} from 'src/schemas/auth';
import { TokenJwtSchema } from 'src/schemas/jwt';
import { mfaMethod } from '../model/mfaMethod';
import { userCommand } from '../store/userCommand';
import { userQuery } from '../store/userQuery';

const decoder = createDecoder();

export const mfaUseCase = {
  associateSoftwareToken: (
    req: AssociateSoftwareTokenTarget['reqBody'],
  ): Promise<AssociateSoftwareTokenTarget['resBody']> =>
    transaction(async (tx) => {
      customAssert(req.AccessToken, 'Eliminate fraudulent requests');

      const payload = TokenJwtSchema.safeParse(decoder(req.AccessToken));

      customAssert(payload.success, 'Eliminate fraudulent requests');

      const user = await userQuery.findById(tx, payload.data.sub);

      customAssert(user.kind === 'cognito', 'Eliminate fraudulent requests');

      const updated = mfaMethod.generateSecretCode(user);

      await userCommand.save(tx, updated);

      return { SecretCode: updated.totpSecretCode, Session: req.Session };
    }),
  verifySoftwareToken: (
    req: VerifySoftwareTokenTarget['reqBody'],
  ): Promise<VerifySoftwareTokenTarget['resBody']> =>
    transaction(async (tx) => {
      customAssert(req.AccessToken, 'Eliminate fraudulent requests');

      const payload = TokenJwtSchema.safeParse(decoder(req.AccessToken));

      customAssert(payload.success, 'Eliminate fraudulent requests');

      const user = await userQuery.findById(tx, payload.data.sub);

      customAssert(user.kind === 'cognito', 'Eliminate fraudulent requests');

      const updated = mfaMethod.verify(user, req.UserCode);

      await userCommand.save(tx, updated);

      return { Status: VerifySoftwareTokenResponseType.SUCCESS, Session: req.Session };
    }),
  setUserMFAPreference: (
    req: SetUserMFAPreferenceTarget['reqBody'],
  ): Promise<SetUserMFAPreferenceTarget['resBody']> =>
    transaction(async (tx) => {
      customAssert(req.AccessToken, 'Eliminate fraudulent requests');

      const payload = TokenJwtSchema.safeParse(decoder(req.AccessToken));

      customAssert(payload.success, 'Eliminate fraudulent requests');

      const user = await userQuery.findById(tx, payload.data.sub);

      customAssert(user.kind === 'cognito', 'Eliminate fraudulent requests');

      const updated = mfaMethod.setPreference(user, req);

      await userCommand.save(tx, updated);

      return {};
    }),
};
