import { createDecoder } from 'fast-jwt';
import type { DeleteUserTarget } from 'schemas/auth';
import { TokenJwtSchema } from 'schemas/jwt';
import { customAssert } from 'server/service/customAssert';
import { transaction } from 'server/service/transaction';
import { userMethod } from '../model/userMethod';
import { userCommand } from '../store/userCommand';
import { userQuery } from '../store/userQuery';

const decoder = createDecoder();

export const userUseCase = {
  deleteUser: (req: DeleteUserTarget['reqBody']): Promise<DeleteUserTarget['resBody']> =>
    transaction(async (tx) => {
      customAssert(req.AccessToken, 'Eliminate fraudulent requests');

      const payload = TokenJwtSchema.safeParse(decoder(req.AccessToken));

      customAssert(payload.success, 'Eliminate fraudulent requests');

      const user = await userQuery.findById(tx, payload.data.sub);
      const deletableId = userMethod.delete(user);

      await userCommand.delete(tx, deletableId);

      return {};
    }),
};
