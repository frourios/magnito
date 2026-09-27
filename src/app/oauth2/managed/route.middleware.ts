import { NextResponse } from 'vinext/shims/server';
import { createMiddleware } from './frourio.middleware';

// oxlint-disable-next-line complexity
export const middleware = createMiddleware(async ({ req, next }) => {
  if (req.method === 'POST') {
    const origin = req.headers.get('origin');
    const requestHost = req.headers.get('host') ?? new URL(req.url).host;
    if (!origin || !URL.canParse(origin) || new URL(origin).host !== requestHost) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
  }

  const response = await next({ requestUrl: req.url });
  if (response.status !== 422) return response;
  return NextResponse.json(
    { error: req.method === 'GET' ? 'Invalid authorization request.' : 'Invalid request.' },
    { status: 400 },
  );
});
