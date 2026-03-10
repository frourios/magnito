import type { EntityId } from 'common/types/brandedId';
import type { UserEntity } from 'common/types/user';
import { brandedId } from 'service/brandedId';

export const userMethod = {
  delete: (user: UserEntity): EntityId['deletableUser'] => {
    return brandedId.deletableUser.entity.parse(user.id);
  },
};
