const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('active runtime no longer depends on Express or a second API port', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies.express, undefined);
  assert.equal(pkg.dependencies.cors, undefined);
  assert.equal(pkg.scripts['dev:api'], undefined);
  assert.equal(pkg.scripts['start:api'], undefined);
  assert.equal(fs.existsSync(path.join(root, 'server.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'api', 'index.js')), false);
});

test('Next.js catch-all Route Handler dispatches API requests in Node runtime', () => {
  const route = fs.readFileSync(path.join(root, 'app/api/[...path]/route.ts'), 'utf8');
  assert.match(route, /runtime\s*=\s*'nodejs'/);
  assert.match(route, /handleNextApiRequest/);
  assert.match(route, /export const GET/);
  assert.match(route, /export const POST/);
});

test('all original backend features remain in the in-process API registry', () => {
  const registry = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  for (const route of [
    '/api/auth/register', '/api/auth/login', '/api/user/profile/:id',
    '/api/sync/codeforces/:handle', '/api/sync/leetcode/:username',
    '/api/sync/codechef/:handle', '/api/topx-pro/verify/:userId',
    '/api/tasks/verify-all/:userId', '/api/admin/overview',
    '/api/admin/vault/problems', '/api/leaderboard', '/api/contests/upcoming',
    '/api/health'
  ]) assert.ok(registry.includes(route), `missing preserved API route ${route}`);
  assert.match(registry, /@neondatabase\/serverless/);
});
