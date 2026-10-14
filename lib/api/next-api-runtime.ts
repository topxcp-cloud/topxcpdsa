import type { NextRequest } from 'next/server';

/**
 * Executes TOP-X's preserved API business logic inside a Next.js Route Handler.
 * There is no second HTTP server and no Express dependency. The registry is
 * loaded lazily so `next build` does not require a configured database merely
 * to compile route modules.
 */
let routeRegistry: { handleRequest: (request: Request) => Promise<Response> } | null = null;
async function getRouteRegistry() {
  if (!routeRegistry) {
    // Load the CommonJS registry through native dynamic import. This avoids
    // relying on createRequire(), which can be transformed incorrectly by
    // Next.js' server bundler in some builds.
    const loaded = await import('./route-registry.cjs');
    routeRegistry = (loaded.default ?? loaded) as { handleRequest: (request: Request) => Promise<Response> };
  }
  return routeRegistry;
}

export async function handleNextApiRequest(request: NextRequest, targetPath?: string, methodOverride?: string) {
  let incoming: Request = request;
  if (targetPath) {
    const rewrittenUrl = new URL(request.url);
    rewrittenUrl.pathname = targetPath;
    const method = (methodOverride || request.method).toUpperCase();
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
