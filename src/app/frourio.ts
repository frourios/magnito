import type { FrourioSpec } from '@frourio/next';
import { z } from 'zod';

export const frourioSpec = {
  middleware: true,
  get: {
    res: {
      200: { body: z.string(), headers: z.object({ 'content-type': z.literal('text/html') }) },
    },
  },
  post: {
    headers: z.object({ 'x-amz-target': z.string() }),
    body: z.record(z.string(), z.any()),
    res: {
      200: {
        headers: z.object({ 'content-type': z.literal('application/x-amz-json-1.1') }),
        body: z.record(z.string(), z.any()),
      },
      400: {
        headers: z.record(z.enum(['X-Amzn-Errormessage', 'X-Amzn-Errortype']), z.string()),
        body: z.object({ message: z.string(), __type: z.string() }),
      },
      403: { body: z.object({ message: z.string() }) },
    },
  },
} satisfies FrourioSpec;
