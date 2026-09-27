import type { FrourioSpec } from '@frourio/vinext';
import { z } from 'zod';

const headers = z.object({
  host: z.string().optional(),
  cookie: z.string().optional(),
});

const authorizationQuery = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().default(''),
  state: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.string().optional(),
  page: z.string().optional(),
});

const action = authorizationQuery
  .pick({ client_id: true, redirect_uri: true, scope: true })
  .extend({
    action: z.enum(['login', 'signup', 'confirm', 'resend', 'forgot', 'reset']),
    username: z.string().min(1),
    password: z.string().optional(),
    email: z.email().optional(),
    code: z.string().optional(),
    state: z.string().optional(),
    code_challenge: z.string().optional(),
    code_challenge_method: z.enum(['plain', 'S256']).optional(),
  });

export const frourioSpec = {
  middleware: { context: z.object({ requestUrl: z.string() }) },
  get: {
    query: authorizationQuery,
    headers,
  },
  post: {
    headers: headers.extend({
      origin: z.string().optional(),
      'x-xsrf-token': z.string().optional(),
    }),
    body: action,
  },
} satisfies FrourioSpec;
