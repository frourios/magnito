import { createDecoder } from 'fast-jwt';
import { customAssert } from 'server/service/customAssert';
import { transaction } from 'server/service/transaction';
import type { DeleteUserTarget } from 'src/schemas/auth';
import { TokenJwtSchema } from 'src/schemas/jwt';
import { userMethod } from '../model/userMethod';
import { userCommand } from '../store/userCommand';
import { userQuery } from '../store/userQuery';
import { userTokenCommand } from '../store/userTokenCommand';
import { userTokenQuery } from '../store/userTokenQuery';

const decoder = createDecoder();

export const userUseCase = {
  deleteUser: (req: DeleteUserTarget['reqBody']): Promise<DeleteUserTarget['resBody']> =>
    transaction(async (tx) => {
      customAssert(req.AccessToken, 'Eliminate fraudulent requests');

      const payload = TokenJwtSchema.safeParse(decoder(req.AccessToken));

      customAssert(payload.success, 'Eliminate fraudulent requests');
      await userTokenQuery.validateAccessToken(tx, req.AccessToken);

      const user = await userQuery.findById(tx, payload.data.sub);
      const deletableId = userMethod.delete(user);

      await userTokenCommand.deleteByUserId(tx, deletableId);
      await userCommand.delete(tx, deletableId);

      return {};
    }),
};
