// Proves/disproves lost updates across 2 instances sharing one DB.
// Usage: node lostupdate.cjs <projectRoot> <N users>
const { spawn } = require('node:child_process');
const root = process.argv[2]; const N = Number(process.argv[3] || 40);
const ports = [4101, 4102];
let xff = 1; const ip = () => `10.${(xff >> 16) & 255}.${(xff >> 8) & 255}.${xff++ & 255}`;
async function call(port, path, opts = {}, cookie) {
  const headers = { 'content-type': 'application/json', 'x-forwarded-for': ip(), ...(cookie ? { cookie } : {}) };
  const r = await fetch(`http://127.0.0.1:${port}${path}`, { ...opts, headers });
  const body = await r.json().catch(() => ({}));
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  return { status: r.status, body, cookie: sc.map(c => c.split(';')[0]).join('; ') };
}
(async () => {
  const procs = ports.map(p => spawn('node', [__dirname + '/instance.cjs', root, String(p)], { env: process.env, stdio: ['ignore', 'pipe', 'inherit'] }));
  await new Promise(r => setTimeout(r, 4000));
  // Register N users via instance A, then make instance B load them.
  const users = [];
  for (let i = 0; i < N; i++) {
    const r = await call(ports[0], '/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'U' + i, email: `u${i}@ex.com`, password: 'password-123' }) });
    if (r.status !== 201) { console.log('register failed', i, r.status, r.body); process.exit(2); }
    users.push({ id: r.body.user.id, cookie: r.cookie });
  }
  // PHASE 1: immediately use the fresh accounts on the *other* instance (what happens when a request lands on a different lambda).
  const vis = await Promise.all(users.slice(0, 10).map((u, i) => call(ports[1], `/api/user/handles/${u.id}`, { method: 'PUT', body: JSON.stringify({ codechef: 'vis' + i }) }, u.cookie)));
  const visibilityFailures = vis.filter(r => r.status === 401).length;
  // PHASE 2: let both instances' reload TTL expire so both hold a full, fresh copy.
  await new Promise(r => setTimeout(r, 16500));
  await call(ports[0], '/api/leaderboard'); await call(ports[1], '/api/leaderboard');
  // Concurrently, each user sets a unique handle, alternating instances.
  const results = await Promise.all(users.map((u, i) => call(ports[i % 2], `/api/user/handles/${u.id}`, { method: 'PUT', body: JSON.stringify({ codechef: 'h' + i }) }, u.cookie)));
  const failed = results.filter(r => r.status !== 200).length; if (failed) console.log('sample failure:', JSON.stringify(results.find(r => r.status !== 200)));
  await new Promise(r => setTimeout(r, 500));
  // Verify via a THIRD fresh instance reading straight from the DB.
  const third = spawn('node', [__dirname + '/instance.cjs', root, '4103'], { env: process.env, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise(r => setTimeout(r, 4000));
  const lb = await call(4103, '/api/leaderboard');
  const byId = new Map((lb.body.members || []).map(m => [m.id, m]));
  let lost = 0, missingUsers = 0;
  users.forEach((u, i) => { const m = byId.get(u.id); if (!m) missingUsers++; else if (m.handles.codechef !== 'h' + i) lost++; });
  console.log(JSON.stringify({ users: N, crossInstance401sOnFreshAccounts: visibilityFailures + '/10', httpFailed: failed, usersMissingFromDB: missingUsers, lostHandleUpdates: lost }));
  [...procs, third].forEach(p => p.kill());
  process.exit(0);
})();
