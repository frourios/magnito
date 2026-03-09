import { z } from 'zod';

export const JwksDtoSchema = z.object({
  keys: z.array(z.object({ kid: z.string(), alg: z.string() })),
});

export type JwksDto = z.infer<typeof JwksDtoSchema>;
