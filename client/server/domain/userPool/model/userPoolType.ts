import type { EntityId } from 'schemas/brandedId';

export type UserPoolEntity = {
  id: EntityId['userPool'];
  name: string;
  privateKey: string;
  createdTime: number;
};

export type UserPoolClientEntity = {
  id: EntityId['userPoolClient'];
  userPoolId: EntityId['userPool'];
  name: string;
  createdTime: number;
};
