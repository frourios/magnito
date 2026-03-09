import { randomUUID } from 'crypto';
import type { EntityId } from 'common/types/brandedId';
import type { UserPoolClientEntity, UserPoolEntity } from 'common/types/userPool';
import { brandedId } from 'service/brandedId';
import { createShortHash } from 'service/createShortHash';
import { REGION } from 'service/envValues';
import { genPrivatekey } from 'service/privateKey';

export const userPoolMethod = {
  create: (val: { id?: EntityId['userPool']; name: string }): UserPoolEntity => ({
    id: brandedId.userPool.entity.parse(`${REGION}_${createShortHash(randomUUID())}`),
    ...val,
    privateKey: genPrivatekey(),
    createdTime: Date.now(),
  }),
  createClient: (val: {
    id?: EntityId['userPoolClient'];
    name: string;
    userPoolId: EntityId['userPool'];
  }): UserPoolClientEntity => ({
    id: brandedId.userPoolClient.entity.parse(randomUUID().replace(/-/g, '')),
    ...val,
    createdTime: Date.now(),
  }),
};
