// Runs one "serverless instance" of the TOP-X API registry on a port. Usage: node instance.cjs <projectRoot> <port>
const [root, port] = [process.argv[2], Number(process.argv[3])];
process.env.NODE_ENV = 'test';
process.env.ADMIN_KEY = 'test-admin-key-that-is-long-enough-123456';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-123456789';
process.env.CRON_SECRET = 'cron-secret-for-tests-0123456789abcdef';
const http = require('node:http');
const app = require(root + '/lib/api/route-registry.cjs');
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks);
  const r = await app.handleRequest(new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body }));
  const headers = {}; r.headers.forEach((v, k) => { headers[k] = v; });
  if (r.headers.getSetCookie) headers['set-cookie'] = r.headers.getSetCookie();
  res.writeHead(r.status, headers); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(port, () => console.log('listening ' + port));
