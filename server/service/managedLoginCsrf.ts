import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { createSigner, createVerifier } from 'fast-jwt';
import { z } from 'zod';
import { SHORT_LIVED_SEC } from './constants';

/* oxlint-disable complexity */

const flowSchema = z.object({
  clientId: z.string(),
  redirectUri: z.string(),
  scope: z.string(),
  state: z.string(),
  codeChallenge: z.string(),
  codeChallengeMethod: z.string(),
  xsrfToken: z.string(),
  phase: z.enum(['entry', 'confirm', 'reset']),
  username: z.string().optional(),
  expiresAt: z.number(),
});

export type ManagedLoginFlow = z.infer<typeof flowSchema>;
export type ManagedLoginFlowRequest = Pick<
  ManagedLoginFlow,
  'clientId' | 'redirectUri' | 'scope' | 'state' | 'codeChallenge' | 'codeChallengeMethod'
>;

const hmacKey = (privateKey: string): string =>
  createHash('sha256').update(privateKey).digest('hex');

export const createManagedLoginFlow = (request: ManagedLoginFlowRequest): ManagedLoginFlow => ({
  ...request,
  xsrfToken: randomBytes(32).toString('base64url'),
  phase: 'entry',
  expiresAt: Date.now() + SHORT_LIVED_SEC * 1000,
});

export const signManagedLoginFlow = (flow: ManagedLoginFlow, privateKey: string): string =>
  createSigner({ key: hmacKey(privateKey), expiresIn: SHORT_LIVED_SEC * 1000 })(flow);

export const readManagedLoginFlow = (
  cookie: string | undefined,
  privateKey: string,
): ManagedLoginFlow | null => {
  if (!cookie) return null;
  try {
    const parsed = flowSchema.safeParse(
      createVerifier({ key: hmacKey(privateKey), algorithms: ['HS256'] })(cookie),
    );
    return parsed.success && parsed.data.expiresAt > Date.now() ? parsed.data : null;
  } catch {
    return null;
  }
};

export const matchesManagedLoginFlow = (
  flow: ManagedLoginFlow,
  request: ManagedLoginFlowRequest,
): boolean =>
  flow.clientId === request.clientId &&
  flow.redirectUri === request.redirectUri &&
  flow.scope === request.scope &&
  flow.state === request.state &&
  flow.codeChallenge === request.codeChallenge &&
  flow.codeChallengeMethod === request.codeChallengeMethod;

export const matchesXsrfToken = (
  flow: ManagedLoginFlow,
  cookie: string | undefined,
  header: string | null,
): boolean => {
  if (!cookie || !header) return false;
  const expected = Buffer.from(flow.xsrfToken);
  const cookieToken = Buffer.from(cookie);
  const headerToken = Buffer.from(header);
  return (
    expected.length === cookieToken.length &&
    expected.length === headerToken.length &&
    timingSafeEqual(expected, cookieToken) &&
    timingSafeEqual(expected, headerToken)
  );
};

export const permitsManagedLoginAction = (
  flow: ManagedLoginFlow,
  action: 'login' | 'signup' | 'confirm' | 'resend' | 'forgot' | 'reset',
  username: string,
): boolean => {
  if (action === 'confirm' || action === 'resend') {
    return flow.phase === 'confirm' && flow.username === username;
  }
  if (action === 'reset') return flow.phase === 'reset' && flow.username === username;
  return true;
};
