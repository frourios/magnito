import { randomUUID } from 'crypto';
import type { DtoId, EntityId } from 'schemas/brandedId';
import { brandedId } from 'schemas/brandedId';
import type { UserPoolClientDto, UserPoolDto } from 'schemas/userPool';
import { createShortHash } from 'server/service/createShortHash';
import { genPrivatekey } from 'server/service/privateKey';
import { REGION } from 'server/service/serverEnvs';
import type { UserPoolClientEntity, UserPoolEntity } from './userPoolType';

export const userPoolMethod = {
  create: (val: { id?: DtoId['userPool']; name: string }): UserPoolEntity => ({
    id: brandedId.userPool.entity.parse(val.id ?? `${REGION}_${createShortHash(randomUUID())}`),
    name: val.name,
    privateKey: genPrivatekey(),
    createdTime: Date.now(),
  }),
  createClient: (val: {
    id?: DtoId['userPoolClient'];
    name: string;
    userPoolId: DtoId['userPool'];
  }): UserPoolClientEntity => ({
    id: brandedId.userPoolClient.entity.parse(val.id ?? randomUUID().replace(/-/g, '')),
    userPoolId: brandedId.userPool.entity.parse(val.userPoolId),
    name: val.name,
    createdTime: Date.now(),
  }),
  deleteUserPool: (dto: UserPoolDto): EntityId['deletableUserPool'] => {
    return brandedId.deletableUserPool.entity.parse(dto.id);
  },
  deleteUserPoolClient: (dto: UserPoolClientDto): EntityId['deletableUserPoolClient'] => {
    return brandedId.deletableUserPoolClient.entity.parse(dto.id);
  },
};
