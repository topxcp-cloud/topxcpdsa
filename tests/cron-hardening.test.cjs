'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('GitHub Actions is the sole scheduled leaderboard refresh driver', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/refresh-leaderboard.yml'), 'utf8');
  assert.equal(Object.hasOwn(vercel, 'crons'), false);
  assert.match(workflow, /concurrency:[\s\S]*group: topx-leaderboard-refresh/);
  assert.match(workflow, /MAX_BATCHES=1000/);
});

test('cron implementation uses persistent lease and retry metadata, not fire-and-forget chaining', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(api, /INSERT INTO topx_cron_leases/);
  assert.match(api, /DELETE FROM topx_cron_leases WHERE lease_key = \$1 AND owner_token = \$2/);
  assert.match(api, /nextRetryAt/);
  assert.doesNotMatch(api, /Auto-chaining|fetch\(nextUrl/);
});

test('PostgreSQL rate limiting is shared across instances and pool TLS verifies certificates', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(api, /topx_rate_limits/);
  assert.match(api, /topx_provider_rate_limits/);
  assert.doesNotMatch(api, /codeforcesRequestQueue|nextCodeforcesRequestAt/);
  assert.match(api, /max: Math\.min\(20/);
  assert.match(api, /rejectUnauthorized: true/);
  assert.doesNotMatch(api, /rejectUnauthorized: false/);
});

test('legacy rate-limit tables are migrated to include required window_start column', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(api, /ALTER TABLE public.topx_rate_limits ADD COLUMN IF NOT EXISTS window_start bigint NOT NULL DEFAULT 0/);
  assert.match(api, /ALTER TABLE public.topx_rate_limits ADD COLUMN IF NOT EXISTS count integer NOT NULL DEFAULT 0/);
  assert.match(api, /ALTER TABLE public.topx_rate_limits ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now\(\)/);
  assert.match(api, /column_name = 'reset_at'/);
  assert.match(api, /ALTER TABLE public\.topx_rate_limits ALTER COLUMN reset_at DROP NOT NULL/);
});

test('password hashing uses asynchronous scrypt and no hardcoded admin master key remains', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  const runtime = fs.readFileSync(path.join(root, 'lib/api/next-api-runtime.ts'), 'utf8');
  const adminEnv = fs.readFileSync(path.join(root, 'admin/.env.example'), 'utf8');
  assert.match(api, /await scryptAsync/);
  assert.doesNotMatch(api, /scryptSync/);
  assert.doesNotMatch(api + runtime + adminEnv, /TX99_k8F7/);
});

test('health endpoint probes the database and reports configuration checks', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(api, /app\.get\('\/api\/health'[\s\S]*?await sql\.query\('SELECT 1'\)/);
  assert.match(api, /cronSecretConfigured/);
});
