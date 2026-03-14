import type { EntityId } from 'src/schemas/brandedId';

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
