import type { FrourioSpec } from '@frourio/next';
import { UserDtoSchema } from 'schemas/user';

export const frourioSpec = {
  get: {
    res: { 200: { body: UserDtoSchema } },
  },
} satisfies FrourioSpec;
