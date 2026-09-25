import type { FrourioSpec } from '@frourio/vinext';
import { z } from 'zod';
import { UserDtoSchema } from '../../schemas/user';

export const frourioSpec = {
  middleware: {
    context: z.object({ user: UserDtoSchema }),
  },
} satisfies FrourioSpec;
