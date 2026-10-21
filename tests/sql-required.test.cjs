const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('API reports PostgreSQL as unavailable when DATABASE_URL is not configured', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'topx-sql-required-'));
  const registryPath = path.join(root, 'lib', 'api', 'route-registry.cjs');
  const script = `
    process.chdir(${JSON.stringify(tempDirectory)});
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = 'test';
    const app = require(${JSON.stringify(registryPath)});
    app.handleRequest(new Request('http://localhost/api/health')).then(async response => {
      const body = await response.json();
      if (response.status !== 503 || !/database unavailable/i.test(body.error || '')) process.exitCode = 1;
    }).catch(() => { process.exitCode = 1; });
  `;

  try {
    execFileSync(process.execPath, ['-e', script], {
      cwd: tempDirectory,
      env: { ...process.env, DATABASE_URL: '', NODE_ENV: 'test' },
      stdio: 'pipe'
    });
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('local JSON persistence files and migration tooling are removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'data', 'db.json')), false);
  assert.equal(fs.existsSync(path.join(root, 'scripts', 'migrate-json-to-postgres.js')), false);
});
