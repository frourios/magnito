import type { MaybeId } from 'schemas/brandedId';
import type {
  SocialUserCreateVal,
  SocialUserDto,
  SocialUserRequestTokensVal,
  SocialUserResponseTokensVal,
} from 'schemas/user';
import { userPoolQuery } from 'server/domain/userPool/store/userPoolQuery';
import { transaction } from 'server/service/transaction';
import { socialUserMethod } from '../model/socialUserMethod';
import { userCommand } from '../store/userCommand';
import { userQuery } from '../store/userQuery';

export const socialUseCase = {
  createUser: (val: SocialUserCreateVal): Promise<SocialUserDto> =>
    transaction(async (tx) => {
      const userPoolClient = await userPoolQuery.findClientById(tx, val.userPoolClientId);
      const user = socialUserMethod.create(userPoolClient.userPoolId, val);

      return await userCommand.save(tx, user);
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
  }): Promise<SocialUserDto> =>
    transaction(async (tx) => {
      const user = await userQuery.findById(tx, val.id);
      const updated = socialUserMethod.updateCodeChallenge(user, val.codeChallenge);

      return await userCommand.save(tx, updated);
    }),
};
