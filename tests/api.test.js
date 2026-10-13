const { test, before, after } = require('node:test');

if (!process.env.DATABASE_URL) {
  test('API integration suite requires a disposable PostgreSQL DATABASE_URL', { skip: 'DATABASE_URL is not configured' }, () => {});
} else {
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.ADMIN_KEY = 'test-admin-key-that-is-long-enough-123456';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-123456789';
const http = require('node:http');
const app = require('../lib/api/route-registry.cjs');
let server;
let baseUrl;
let memberToken;
let memberId;
let secondToken;

async function request(pathname, options = {}) {
  const headers = Object.assign({ 'content-type': 'application/json' }, options.headers || {});
  const response = await fetch(baseUrl + pathname, Object.assign({}, options, { headers }));
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

before(async (t) => {
  if (!process.env.DATABASE_URL) { t.skip('Set DATABASE_URL to a disposable PostgreSQL test database.'); return; }
  server = http.createServer(async (req, res) => {
    const url = `http://${req.headers.host || '127.0.0.1'}${req.url}`;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks);
    const webRequest = new Request(url, {
      method: req.method,
      headers: req.headers,
      body
    });
    const webResponse = await app.handleRequest(webRequest);
    res.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));
    const arrayBuffer = await webResponse.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));
  });
  server.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const health = await request('/api/health');
  assert.equal(health.response.status, 200);
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

test('registration validates fields and returns a real server session', async () => {
  const bad = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: 'bad', password: 'short' }) });
  assert.equal(bad.response.status, 400);
  const good = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Test Member', email: 'member@example.com', password: 'password-123' }) });
  assert.equal(good.response.status, 201);
  assert.equal(good.body.user.name, 'Test Member');
  assert.ok(good.body.token);
  assert.equal(Object.hasOwn(good.body.user, 'password'), false);
  memberToken = good.body.token;
  memberId = good.body.user.id;
});

test('login rejects incorrect credentials and accepts correct credentials', async () => {
  const bad = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'member@example.com', password: 'wrong-password' }) });
  assert.equal(bad.response.status, 401);
  const good = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'MEMBER@example.com', password: 'password-123' }) });
  assert.equal(good.response.status, 200);
  assert.ok(good.body.token);
});

test('session endpoint returns authenticated user and rejects missing token', async () => {
  const noAuth = await request('/api/auth/me');
  assert.equal(noAuth.response.status, 401);
  const auth = await request('/api/auth/me', { headers: { authorization: `Bearer ${memberToken}` } });
  assert.equal(auth.response.status, 200);
  assert.equal(auth.body.user.id, memberId);
});

test('users cannot access another member profile or mutate another member task state', async () => {
  const second = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Second Member', email: 'second@example.com', password: 'password-456' }) });
  assert.equal(second.response.status, 201);
  secondToken = second.body.token;
  const profile = await request(`/api/user/profile/${second.body.user.id}`, { headers: { authorization: `Bearer ${memberToken}` } });
  assert.equal(profile.response.status, 403);
  const syncOther = await request(`/api/sync/all/${second.body.user.id}`, { method: 'POST', headers: { authorization: `Bearer ${memberToken}` } });
  assert.equal(syncOther.response.status, 403);
  const task = await request('/api/tasks/verify', { method: 'POST', headers: { authorization: `Bearer ${memberToken}` }, body: JSON.stringify({ userId: second.body.user.id, taskId: 'task-1' }) });
  assert.equal(task.response.status, 403);
});

test('Pro verification creates a pending review request instead of falsely claiming auto-verification', async () => {
  const saveHandle = await request(`/api/user/handles/${memberId}`, { method: 'PUT', headers: { authorization: `Bearer ${memberToken}` }, body: JSON.stringify({ codechef: 'test_handle' }) });
  assert.equal(saveHandle.response.status, 200);
  const pending = await request(`/api/topx-pro/verify/${memberId}`, { method: 'POST', headers: { authorization: `Bearer ${memberToken}` } });
  assert.equal(pending.response.status, 202);
  assert.equal(pending.body.verificationStatus, 'pending');
  assert.equal(pending.body.isPro, false);
});

test('admin routes require an authenticated admin token', async () => {
  const denied = await request('/api/admin/overview');
  assert.equal(denied.response.status, 401);
  const login = await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ key: process.env.ADMIN_KEY }) });
  assert.equal(login.response.status, 200);
  const overview = await request('/api/admin/overview', { headers: { authorization: `Bearer ${login.body.token}` } });
  assert.equal(overview.response.status, 200);
  assert.ok(overview.body.totalUsers >= 2);
});

test('leaderboard uses registered accounts, not hard-coded demo members', async () => {
  const result = await request('/api/leaderboard');
  assert.equal(result.response.status, 200);
  assert.ok(result.body.members.some(member => member.id === memberId));
  assert.equal(Object.hasOwn(result.body.members[0] || {}, 'email'), false);
});

}
