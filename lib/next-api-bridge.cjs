'use strict';
/**
 * Tiny request router used only to preserve the original TOP-X API business
 * handlers while they execute inside Next.js Route Handlers. This is not an
 * HTTP server and does not listen on a port. Express is not used.
 */
const { URL } = require('node:url');
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function compilePath(pattern, prefix = false) {
  if (Array.isArray(pattern)) return pattern.map(p => compilePath(p, prefix));
  const names = [];
  const pieces = String(pattern || '/').split('/').map((part, i) => {
    if (part.startsWith(':')) { names.push(part.slice(1)); return '([^/]+)'; }
    return escapeRegex(part);
  });
  let source = pieces.join('/');
  if (prefix) source = source === '/' ? '^/' : '^' + source + '(?=/|$)';
  else source = '^' + source + '/?$';
  return { regex: new RegExp(source), names };
}
function matchPath(compiled, pathname) {
  if (Array.isArray(compiled)) { for (const c of compiled) { const m = matchPath(c, pathname); if (m) return m; } return null; }
  const match = pathname.match(compiled.regex);
  if (!match) return null;
  const params = {};
  compiled.names.forEach((name, i) => { try { params[name] = decodeURIComponent(match[i + 1]); } catch { params[name] = match[i + 1]; } });
  return params;
}
function expressCompat() {
  const stack = [];
  const app = function () {};
  app.disable = () => app;
  app.use = (path, ...handlers) => {
    if (typeof path === 'function') { handlers.unshift(path); path = '/'; }
    if (!handlers.length) return app;
    const middlewarePath = compilePath(path, true);
    for (const handler of handlers) {
      if (typeof handler !== 'function' || handler.length === 4) continue; // error handlers are covered by the outer Next route boundary
      stack.push({ kind: 'middleware', path: middlewarePath, mountPath: path, handler });
    }
    return app;
  };
  for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']) {
    app[method] = (path, ...handlers) => {
      stack.push({ kind: 'route', method: method.toUpperCase(), path: compilePath(path), handlers });
      return app;
    };
  }
  app.handleRequest = async (webRequest) => {
    const url = new URL(webRequest.url);
    const pathname = url.pathname;
    const method = webRequest.method.toUpperCase();
    const requestHeaders = Object.fromEntries(webRequest.headers.entries());
    const rawBody = ['GET', 'HEAD'].includes(method) ? '' : await webRequest.text();
    let body = {};
    if (rawBody) {
      try { body = JSON.parse(rawBody); }
      catch { return Response.json({ error: 'Invalid JSON request body.' }, { status: 400 }); }
    }
    const req = {
      method, path: pathname, originalUrl: pathname + url.search, url: pathname + url.search,
      headers: requestHeaders, body, params: {}, query: Object.fromEntries(url.searchParams.entries()),
      ip: requestHeaders['x-forwarded-for']?.split(',')[0]?.trim() || '127.0.0.1',
      authUser: null
    };
    const responseHeaders = new Headers();
    let statusCode = 200, responseBody = null, sent = false;
    const res = {
      get headersSent() { return sent; },
      status(code) { statusCode = code; return this; },
      setHeader(name, value) { responseHeaders.set(name, String(value)); return this; },
      getHeader(name) { return responseHeaders.get(name); },
      json(value) { if (sent) return this; responseHeaders.set('content-type', 'application/json; charset=utf-8'); responseBody = JSON.stringify(value); sent = true; return this; },
      send(value) { if (sent) return this; responseBody = value == null ? '' : String(value); sent = true; return this; },
      end(value) { if (sent) return this; responseBody = value == null ? '' : String(value); sent = true; return this; }
    };
    const dispatch = async (index) => {
      if (sent || index >= stack.length) return;
      const layer = stack[index];
      if (layer.kind === 'middleware') {
        const mountMatch = matchPath(layer.path, pathname);
        if (!mountMatch) return dispatch(index + 1);
        const oldPath = req.path;
        const mount = Array.isArray(layer.mountPath) ? layer.mountPath.find(p => pathname === p || pathname.startsWith(p.replace(/\/$/, '') + '/')) : layer.mountPath;
        if (mount && mount !== '/') req.path = pathname.slice(String(mount).length) || '/';
        let nextPromise = null, nextCalled = false;
        const next = (err) => { if (err) throw err; if (!nextCalled) { nextCalled = true; nextPromise = dispatch(index + 1); } return nextPromise; };
        try { await layer.handler(req, res, next); if (nextPromise) await nextPromise; }
        finally { req.path = oldPath; }
        return;
      }
      if (layer.method !== method && !(method === 'HEAD' && layer.method === 'GET')) return dispatch(index + 1);
      const params = matchPath(layer.path, pathname);
      if (!params) return dispatch(index + 1);
      const oldParams = req.params;
      req.params = params;
      let handlerIndex = 0;
      const runHandler = async () => {
        if (sent || handlerIndex >= layer.handlers.length) return;
        const handler = layer.handlers[handlerIndex++];
        let nextPromise = null, nextCalled = false;
        const next = (err) => { if (err) throw err; if (!nextCalled) { nextCalled = true; nextPromise = runHandler(); } return nextPromise; };
        await handler(req, res, next);
        if (nextPromise) await nextPromise;
      };
      try { await runHandler(); } finally { req.params = oldParams; }
      if (!sent) return dispatch(index + 1);
    };
    try { await dispatch(0); }
    catch (error) {
      console.error('TOP-X API route error:', error?.message || error, error?.cause?.message ? '(' + error.cause.message + ')' : '');
      if (!sent) {
        statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
        responseHeaders.set('content-type', 'application/json; charset=utf-8');
        responseBody = JSON.stringify({ error: error?.clientMessage || 'Unexpected server error. Please try again.' });
        sent = true;
      }
    }
    if (!sent) { statusCode = 404; responseHeaders.set('content-type', 'application/json; charset=utf-8'); responseBody = JSON.stringify({ error: 'API route not found.' }); }
    if (!responseHeaders.has('x-content-type-options')) responseHeaders.set('x-content-type-options', 'nosniff');
    if (!responseHeaders.has('referrer-policy')) responseHeaders.set('referrer-policy', 'strict-origin-when-cross-origin');
    if (!responseHeaders.has('x-frame-options')) responseHeaders.set('x-frame-options', 'DENY');
    if (method === 'HEAD') responseBody = null;
    return new Response(responseBody, { status: statusCode, headers: responseHeaders });
  };
  return app;
}
expressCompat.json = () => (_req, _res, next) => next();
expressCompat.static = () => (_req, _res, next) => next();
module.exports = { express: expressCompat };
