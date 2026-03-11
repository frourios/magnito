import assert from 'assert';
import type { DeleteUserTarget } from 'common/types/auth';
import { jwtDecode } from 'jwt-decode';
import { transaction } from 'server/service/prismaClient';
import type { AccessTokenJwt } from 'server/service/types';
import { userMethod } from '../model/userMethod';
import { userCommand } from '../store/userCommand';
import { userQuery } from '../store/userQuery';

export const userUseCase = {
  deleteUser: (req: DeleteUserTarget['reqBody']): Promise<DeleteUserTarget['resBody']> =>
    transaction(async (tx) => {
      assert(req.AccessToken);

      const decoded = jwtDecode<AccessTokenJwt>(req.AccessToken);
      const user = await userQuery.findById(tx, decoded.sub);
      const deletableId = userMethod.delete(user);

      await userCommand.delete(tx, deletableId);

      return {};
    }),
};
