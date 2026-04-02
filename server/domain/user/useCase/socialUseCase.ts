import { userPoolQuery } from 'server/domain/userPool/store/userPoolQuery';
import { transaction } from 'server/service/transaction';
import type { MaybeId } from 'src/schemas/brandedId';
import type {
  SocialUserCreateVal,
  SocialUserDto,
  SocialUserRequestTokensVal,
  SocialUserResponseTokensVal,
} from 'src/schemas/user';
import { socialUserMethod } from '../model/socialUserMethod';
import { userCommand } from '../store/userCommand';
import { userQuery } from '../store/userQuery';
import { userTokenCommand } from '../store/userTokenCommand';

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

      const tokens = socialUserMethod.createToken(user, val.code_verifier, pool, poolClient, jwks);

      await userTokenCommand.createTokens(tx, user.id, {
        AccessToken: tokens.access_token,
        IdToken: tokens.id_token,
        RefreshToken: tokens.refresh_token,
      });

      return tokens;
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
