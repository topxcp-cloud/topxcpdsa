import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';

function timingSafeCheck(aStr: string, bStr: string): boolean {
  if (!aStr || !bStr) return false;
  const a = Buffer.from(aStr);
  const b = Buffer.from(bStr);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Executes TOP-X's preserved API business logic inside a Next.js Route Handler.
 * There is no second HTTP server and no Express dependency. The registry is
 * loaded lazily so `next build` does not require a configured database merely
 * to compile route modules.
 */
let routeRegistry: { handleRequest: (request: Request) => Promise<Response> } | null = null;
async function getRouteRegistry() {
  if (!routeRegistry || process.env.NODE_ENV !== 'production') {
    // Load the CommonJS registry through native dynamic import. This avoids
    // relying on createRequire(), which can be transformed incorrectly by
    // Next.js' server bundler in some builds.
    const loaded = await import('./route-registry.cjs');
    routeRegistry = (loaded.default ?? loaded) as { handleRequest: (request: Request) => Promise<Response> };
  }
  return routeRegistry;
}

export async function handleNextApiRequest(request: NextRequest, targetPath?: string, methodOverride?: string) {
  const url = new URL(request.url);
  const pathname = targetPath || url.pathname;
  const method = (methodOverride || request.method).toUpperCase();

  if (pathname === '/api/admin/login' && method === 'POST') {
    try {
      const cloned = request.clone();
      const body = await cloned.json().catch(() => ({}));
      let key = typeof body?.key === 'string' ? body.key.trim() : '';

      if (key.startsWith('ADMIN_KEY=')) {
        key = key.slice('ADMIN_KEY='.length).trim();
      }
      if (key.length >= 2 && ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'")))) {
        key = key.slice(1, -1);
      }

      const configured = String(process.env.ADMIN_KEY || '').trim();
      if (!configured || (process.env.NODE_ENV === 'production' && configured.length < 24)) {
        return NextResponse.json({ error: 'Admin authentication is not configured securely.' }, { status: 503 });
      }
      if (!key) return NextResponse.json({ error: 'Admin key is required.' }, { status: 401 });
      if (!timingSafeCheck(key, configured)) {
        return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
      }

      const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
      const signature = crypto.createHmac('sha256', configured).update(payload).digest('base64url');
      const token = `${payload}.${signature}`;

      const response = NextResponse.json({ success: true, expiresIn: 8 * 60 * 60 });
      response.cookies.set('topx_admin_session', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60,
      });

      return response;
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Authentication error.' }, { status: 500 });
    }
  }

  let incoming: Request = request;
  if (targetPath) {
    const rewrittenUrl = new URL(request.url);
    rewrittenUrl.pathname = targetPath;
    incoming = new Request(rewrittenUrl, {
      method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
    });
  }
  const registry = await getRouteRegistry();
  return registry.handleRequest(incoming);
}
