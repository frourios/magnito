import assert from 'assert';
import type { DeleteUserTarget } from 'common/types/auth';
import { jwtDecode } from 'jwt-decode';
import { transaction } from 'service/prismaClient';
import type { AccessTokenJwt } from 'service/types';
import { userMethod } from '../model/userMethod';
import { userCommand } from '../repository/userCommand';
import { userQuery } from '../repository/userQuery';

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
