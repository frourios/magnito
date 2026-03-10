import assert from 'assert';
import { VerifySoftwareTokenResponseType } from '@aws-sdk/client-cognito-identity-provider';
import type {
  AssociateSoftwareTokenTarget,
  SetUserMFAPreferenceTarget,
  VerifySoftwareTokenTarget,
} from 'common/types/auth';
import { jwtDecode } from 'jwt-decode';
import { transaction } from 'service/prismaClient';
import type { AccessTokenJwt } from 'service/types';
import { mfaMethod } from '../model/mfaMethod';
import { userCommand } from '../repository/userCommand';
import { userQuery } from '../repository/userQuery';

export const mfaUseCase = {
  associateSoftwareToken: (
    req: AssociateSoftwareTokenTarget['reqBody'],
  ): Promise<AssociateSoftwareTokenTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.AccessToken);

      const decoded = jwtDecode<AccessTokenJwt>(req.AccessToken);
      const user = await userQuery.findById(tx, decoded.sub);

      assert(user.kind === 'cognito');

      const updated = mfaMethod.generateSecretCode(user);

      await userCommand.save(tx, updated);

      return { SecretCode: updated.totpSecretCode, Session: req.Session };
    }),
  verifySoftwareToken: (
    req: VerifySoftwareTokenTarget['reqBody'],
  ): Promise<VerifySoftwareTokenTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.AccessToken);

      const decoded = jwtDecode<AccessTokenJwt>(req.AccessToken);
      const user = await userQuery.findById(tx, decoded.sub);

      assert(user.kind === 'cognito');

      const updated = mfaMethod.verify(user, req.UserCode);

      await userCommand.save(tx, updated);

      return { Status: VerifySoftwareTokenResponseType.SUCCESS, Session: req.Session };
    }),
  setUserMFAPreference: (
    req: SetUserMFAPreferenceTarget['reqBody'],
  ): Promise<SetUserMFAPreferenceTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.AccessToken);

      const decoded = jwtDecode<AccessTokenJwt>(req.AccessToken);
      const user = await userQuery.findById(tx, decoded.sub);

      assert(user.kind === 'cognito');

      const updated = mfaMethod.setPreference(user, req);

      await userCommand.save(tx, updated);

      return {};
    }),
};
