import type { MaybeId } from 'schemas/brandedId';
import type {
  SocialUserCreateVal,
  SocialUserRequestTokensVal,
  SocialUserResponseTokensVal,
} from 'schemas/user';
import { userPoolQuery } from 'server/domain/userPool/store/userPoolQuery';
import { transaction } from 'server/service/prismaClient';
import { socialUserMethod } from '../model/socialUserMethod';
import type { SocialUserEntity } from '../model/userType';
import { userCommand } from '../store/userCommand';
import { userQuery } from '../store/userQuery';

export const socialUseCase = {
  createUser: (val: SocialUserCreateVal): Promise<SocialUserEntity> =>
    transaction(async (tx) => {
      const userPoolClient = await userPoolQuery.findClientById(tx, val.userPoolClientId);
      const user = socialUserMethod.create(userPoolClient.userPoolId, val);

      await userCommand.save(tx, user);

      return user;
    }),
  getTokens: (val: SocialUserRequestTokensVal): Promise<SocialUserResponseTokensVal> =>
    transaction(async (tx) => {
      const user = await userQuery.findByAuthorizationCode(tx, val.code);
      const pool = await userPoolQuery.findById(tx, user.userPoolId);
      const poolClient = await userPoolQuery.findClientById(tx, val.client_id);
      const jwks = await userPoolQuery.findJwks(tx, user.userPoolId);

      return socialUserMethod.createToken(user, val.code_verifier, pool, poolClient, jwks);
    }),
  updateCodeChallenge: (val: {
    id: MaybeId['socialUser'];
    codeChallenge: string;
  }): Promise<SocialUserEntity> =>
    transaction(async (tx) => {
      const user = await userQuery.findById(tx, val.id);
      const updated = socialUserMethod.updateCodeChallenge(user, val.codeChallenge);

      await userCommand.save(tx, updated);

      return updated;
    }),
};
