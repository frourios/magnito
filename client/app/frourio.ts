import type { FrourioSpec } from '@frourio/next';
import { AmzTargetKeys, AmzTargetSchemas } from 'schemas/auth';
import { z } from 'zod';

export const frourioSpec = {
  get: {
    res: {
      200: { body: z.string(), headers: z.object({ 'Content-Type': z.literal('text/html') }) },
    },
  },
  post: {
    headers: z.object({ 'x-amz-target': z.enum(AmzTargetKeys) }),
    body: z.union([
      AmzTargetSchemas[AmzTargetKeys[0]].reqBody,
      AmzTargetSchemas[AmzTargetKeys[1]].reqBody,
      ...AmzTargetKeys.slice(2).map((key) => AmzTargetSchemas[key].reqBody),
    ]),
    res: {
      200: {
        headers: z.object({ 'content-type': z.literal('application/x-amz-json-1.1') }),
        body: z.union([
          AmzTargetSchemas[AmzTargetKeys[0]].resBody,
          AmzTargetSchemas[AmzTargetKeys[1]].resBody,
          ...AmzTargetKeys.slice(2).map((key) => AmzTargetSchemas[key].resBody),
        ]),
      },
      400: {
        headers: z.record(z.enum(['X-Amzn-Errormessage', 'X-Amzn-Errortype']), z.string()),
        body: z.object({ message: z.string(), __type: z.string() }),
      },
      403: { body: z.record(z.string(), z.never()) },
    },
  },
} satisfies FrourioSpec;
