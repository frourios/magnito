import type { FrourioSpec } from '@frourio/next';
import { UserDtoSchema } from 'src/schemas/user';
import { z } from 'zod';

export const frourioSpec = {
  middleware: {
    context: z.object({ user: UserDtoSchema }),
  },
} satisfies FrourioSpec;
