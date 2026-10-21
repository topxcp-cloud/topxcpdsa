// 1000 heavy users, 3 server instances sharing one DB, 70 concurrent virtual users. Verifies latency AND that no acknowledged write is lost.
// Usage: node scale.cjs <projectRoot>
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const root = process.argv[2];
const DB = process.env.DATABASE_URL;
const pg = require(root + '/node_modules/pg');
const SECRET = 'test-session-secret-that-is-long-enough-123456789';
const TOTAL_USERS = 1000, ACTIVE = 70, SECONDS = Number(process.env.SECONDS || 40);
const ports = [4201, 4202, 4203];
const token = id => { const p = Buffer.from(JSON.stringify({ sub: id, exp: Date.now() + 864e5 })).toString('base64url'); return p + '.' + crypto.createHmac('sha256', SECRET).update(p).digest('base64url'); };

function makeUser(i) {
  const days = {}; const now = Date.now();
  for (let d = 0; d < 300; d++) { const dt = new Date(now - d * 864e5).toISOString().slice(0, 10); days[dt] = { leetcode: (i + d) % 4, codeforces: (i * d) % 3, codechef: d % 2 }; }
  const subs = Array.from({ length: 200 }, (_, k) => ({ platform: 'leetcode', title: 'Problem number ' + k + ' with a reasonably long title', ts: now - k * 3600e3, id: 'sub-' + i + '-' + k, lang: 'cpp', status: 'Accepted' }));
  return { id: 'user-seed-' + i, name: 'Student ' + i, email: `student${i}@college.edu`, password: 'scrypt$00$00', avatar: '', college: 'IET DAVV', academicYear: ['First', 'Second', 'Third', 'Fourth'][i % 4], branch: 'CSE', section: 'ABCD'[i % 4], classDivision: '', isPro: false, proProgress: 0,
    handles: { leetcode: 'lc' + i, codeforces: 'cf' + i, codechef: '' }, syncedStats: { leetcode: { solved: i % 300, easy: 10, medium: 20, hard: 5, solvedCountComplete: true }, codeforces: null, codechef: null },
    dailyActivity: {}, submissionActivityByDay: days, activitySubmissions: subs, totalUniqueSolved: i % 300, totalPlatformSolvesComplete: true,
    completedTasks: Array.from({ length: 30 }, (_, k) => ({ taskId: 'task-' + k, at: new Date(now - k * 864e5).toISOString() })), solvedCodeChef500: [], roadmapProgress: { dsa: {}, cp: {} }, solvedVaultProblemIds: [], createdAt: new Date().toISOString(), accountStatus: 'active' };
}
const pct = (arr, p) => arr.length ? arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor(arr.length * p))] : 0;

(async () => {
  const admin = new pg.Client({ connectionString: DB.replace(/\/[^/]*$/, '/postgres') }); await admin.connect();
  const dbName = DB.split('/').pop();
  await admin.query(`DROP DATABASE IF EXISTS ${dbName}`); await admin.query(`CREATE DATABASE ${dbName}`); await admin.end();

  // First instance creates the schema (cold start on empty DB).
  const spawnInst = port => spawn('node', [__dirname + '/instance.cjs', root, String(port)], { env: process.env, stdio: ['ignore', 'ignore', 'inherit'] });
  const procs = [spawnInst(ports[0])];
  await new Promise(r => setTimeout(r, 3000));

  const c = new pg.Client({ connectionString: DB }); await c.connect();
  const t0 = Date.now();
  const seed = Array.from({ length: TOTAL_USERS }, (_, i) => makeUser(i));
  for (let i = 0; i < seed.length; i += 100) {
    const chunk = seed.slice(i, i + 100);
    await c.query(`INSERT INTO topx_users (id, data) SELECT u->>'id', u FROM jsonb_array_elements($1::jsonb) u ON CONFLICT DO NOTHING`, [JSON.stringify(chunk)]);
  }
  const size = (await c.query(`SELECT count(*)::int n, pg_size_pretty(sum(length(data::text))) total, round(avg(length(data::text))/1024) avg_kb FROM topx_users`)).rows[0];
  console.log(`seeded ${size.n} users, total ${size.total}, avg ${size.avg_kb} KB/user (${Date.now() - t0} ms)`);
  procs[0].kill(); await new Promise(r => setTimeout(r, 500));

  // Cold start with the full dataset.
  const cold0 = Date.now(); procs[0] = spawnInst(ports[0]);
  for (;;) { try { const r = await fetch(`http://127.0.0.1:${ports[0]}/api/health`); if (r.ok) break; } catch (_) {} await new Promise(r => setTimeout(r, 100)); }
  console.log(`cold start (load ${TOTAL_USERS} users): ${Date.now() - cold0} ms`);
  procs.push(spawnInst(ports[1]), spawnInst(ports[2]));
  for (const p of ports.slice(1)) for (;;) { try { const r = await fetch(`http://127.0.0.1:${p}/api/health`); if (r.ok) break; } catch (_) {} await new Promise(r => setTimeout(r, 100)); }

  // Virtual users.
  let xff = 1; const ip = () => `10.1.${(xff >> 8) & 255}.${xff++ & 255}`;
  const lat = { read: [], write: [] }; let errors = 0, writesOk = 0, reads = 0; const lastWritten = new Map(); const errSamples = [];
  const stopAt = Date.now() + SECONDS * 1000;
  const vus = Array.from({ length: ACTIVE }, (_, v) => (async () => {
    const id = 'user-seed-' + v; const cookie = 'topx_session=' + token(id); let n = 0;
    while (Date.now() < stopAt) {
      const port = ports[Math.floor(Math.random() * ports.length)];
      const isWrite = Math.random() < Number(process.env.WRITE_RATIO || 0.3); const t = Date.now();
      try {
        let r;
        if (isWrite) { const val = `v${v}_${n++}`; r = await fetch(`http://127.0.0.1:${port}/api/user/handles/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json', cookie, 'x-forwarded-for': ip() }, body: JSON.stringify({ codechef: val }) }); if (r.status === 200) { writesOk++; lastWritten.set(id, val); } }
        else { r = await fetch(`http://127.0.0.1:${port}/api/leaderboard?metric=${['solved', 'streak', 'rating'][Math.floor(Math.random() * 3)]}&year=${['all', 'First', 'Second'][Math.floor(Math.random() * 3)]}`, { headers: { 'x-forwarded-for': ip() } }); await r.arrayBuffer(); reads++; }
        (isWrite ? lat.write : lat.read).push(Date.now() - t);
        if (r.status !== 200) { errors++; if (errSamples.length < 3) errSamples.push(r.status); }
      } catch (e) { errors++; if (errSamples.length < 3) errSamples.push(String(e.message)); }
      await new Promise(r => setTimeout(r, Number(process.env.THINK_MIN || 100) + Math.random() * Number(process.env.THINK_SPREAD || 400)));
    }
  })());
  await Promise.all(vus);
  console.log(`load: ${ACTIVE} users x ${SECONDS}s | reads ${reads} writes ${writesOk} errors ${errors} ${errSamples.length ? JSON.stringify(errSamples) : ''}`);
  console.log(`read  latency ms: p50 ${pct(lat.read, .5)} p95 ${pct(lat.read, .95)} p99 ${pct(lat.read, .99)} max ${pct(lat.read, 1)}`);
  console.log(`write latency ms: p50 ${pct(lat.write, .5)} p95 ${pct(lat.write, .95)} p99 ${pct(lat.write, .99)} max ${pct(lat.write, 1)}`);

  // Verify straight from the database: every acknowledged write must be present.
  await new Promise(r => setTimeout(r, 800));
  const rows = (await c.query(`SELECT data->'handles'->>'codechef' AS h, data->>'id' AS id FROM topx_users`)).rows;
  const byId = new Map(rows.map(r => [r.id, r.h]));
  let lost = 0; for (const [id, val] of lastWritten) if (byId.get(id) !== val) lost++;
  console.log(`VERIFY: users that wrote ${lastWritten.size}, lost final updates ${lost}, users in DB ${rows.length}/${TOTAL_USERS}`);
  await c.end(); procs.forEach(p => p.kill()); process.exit(lost ? 1 : 0);
})();
