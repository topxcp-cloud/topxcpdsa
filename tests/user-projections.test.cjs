const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// listUsers() throws on unknown projection fields, which surfaces as a 500 only when that route is hit.
// This audits every call site statically so a typo cannot ship unnoticed.
test('every listUsers({ fields }) call site only requests supported projections', () => {
  const dir = path.join(__dirname, '..', 'lib', 'api');
  const layer = fs.readFileSync(path.join(dir, 'data-layer.cjs'), 'utf8');
  const block = layer.match(/USER_PROJECTIONS = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
  assert.ok(block, 'USER_PROJECTIONS not found');
  const supported = new Set([...block[1].matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map(m => m[1]));
  const registry = fs.readFileSync(path.join(dir, 'route-registry.cjs'), 'utf8');
  const calls = [...registry.matchAll(/fields:\s*\[([^\]]*)\]/g)];
  assert.ok(calls.length > 0);
  for (const call of calls) {
    for (const [, name] of call[1].matchAll(/'([^']+)'/g)) {
      assert.ok(supported.has(name), `Unsupported listUsers projection: ${name}`);
    }
  }
});
