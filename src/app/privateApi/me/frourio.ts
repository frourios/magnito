import type { FrourioSpec } from '@frourio/next';
import { UserDtoSchema } from 'src/schemas/user';

export const frourioSpec = {
  get: {
    res: { 200: { body: UserDtoSchema } },
  },
} satisfies FrourioSpec;
