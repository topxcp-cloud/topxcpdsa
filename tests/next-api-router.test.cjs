const test = require('node:test');
const assert = require('node:assert/strict');
const { express } = require('../lib/next-api-bridge.cjs');

test('in-process router dispatches route params and JSON bodies', async () => {
  const app = express();
  app.post('/api/items/:id', async (req, res) => {
    res.status(201).json({ id: req.params.id, name: req.body.name });
  });
  const response = await app.handleRequest(new Request('http://localhost/api/items/abc', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'TOP-X' })
  }));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: 'abc', name: 'TOP-X' });
});

test('mounted auth middleware can reject or continue requests', async () => {
  const app = express();
  app.use('/api/private', (req, res, next) => {
    if (req.headers.authorization !== 'Bearer ok') return res.status(401).json({ error: 'unauthorized' });
    return next();
  });
  app.get('/api/private/me', (req, res) => res.json({ path: req.path, ok: true }));
  const denied = await app.handleRequest(new Request('http://localhost/api/private/me'));
  assert.equal(denied.status, 401);
  const allowed = await app.handleRequest(new Request('http://localhost/api/private/me', { headers: { authorization: 'Bearer ok' } }));
  assert.equal(allowed.status, 200);
  assert.deepEqual(await allowed.json(), { path: '/me', ok: true });
});
