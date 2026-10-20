/**
 * Top-X Unified Backend Server (Node.js + Express)
 * Provides:
 * - Authentication (Email/Password & Google Sign-In)
 * - User Profiles & Profile Picture Upload/Select
 * - Live Platform API Sync (Codeforces, LeetCode, CodeChef)
 * - Top-X Pro Qualification (CodeChef 500-rated 40 problems tracker)
 * - Daily Member Tasks with auto-verification
 * - Secure Admin Console for managing resources, tasks, and users
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load local .env without a dependency. On local development, .env is the
// source of truth so stale PowerShell variables cannot silently override it.
// On Vercel, platform-provided environment variables always take precedence.
(function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  const contents = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, ''); // tolerate UTF-8 BOM from Windows editors
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const name = match[1];
    if (isVercel && Object.prototype.hasOwnProperty.call(process.env, name)) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[name] = value.replace(/\\n/g, '\n');
  }
})();

const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');

const app = express();
const PORT = process.env.PORT || 3000;
const EXTERNAL_API_TIMEOUT_MS = 9000;
const externalJsonCache = new Map();
const externalJsonInFlight = new Map();
async function fetchExternalJson(url) {
  const cached = externalJsonCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (externalJsonInFlight.has(url)) return externalJsonInFlight.get(url);
  const request = (async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS), headers: { 'Accept': 'application/json', 'User-Agent': 'TOP-X/1.0' } });
    if (!response.ok) throw new Error('External API returned HTTP ' + response.status);
    const value = await response.json();
    externalJsonCache.set(url, { value, expiresAt: Date.now() + 5 * 60 * 1000 });
    return value;
  })().finally(() => externalJsonInFlight.delete(url));
  externalJsonInFlight.set(url, request);
  return request;
}

// CodeChef's old codechef-api.vercel.app endpoint may return HTTP 402. Use the
// maintained community stats service instead; it exposes separate summary routes.
function codeChefPayload(response) {
  if (!response || response.status === 'error' || response.success === false) {
    throw new Error(String(response && response.message || 'CodeChef handle not found'));
  }
  return response.data && typeof response.data === 'object' ? response.data : response;
}
function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (value !== null && value !== undefined && value !== '' && Number.isFinite(number)) return number;
  }
  return 0;
}
async function fetchCodeChefStats(handle) {
  if (!/^[A-Za-z0-9_.-]{1,50}$/.test(handle)) throw new Error('Invalid CodeChef handle');
  const base = 'https://codechef-stats.tashif.codes/' + encodeURIComponent(handle);
  // Canonical routes are /{handle}/stats, /{handle}/profile, etc.
  const [statsResponse, ratingResponse, profileResponse, contestsResponse] = await Promise.all([
    fetchExternalJson(base + '/stats'),
    fetchExternalJson(base + '/rating').catch(() => null),
    fetchExternalJson(base + '/profile').catch(() => null),
    fetchExternalJson(base + '/contests').catch(() => null)
  ]);
  const unwrap = (response) => {
    if (!response || response.status === 'error' || response.success === false) throw new Error(String(response && (response.message || response.detail) || 'CodeChef provider returned an error'));
    let value = response.data && typeof response.data === 'object' ? response.data : response;
    // Some versions wrap data more than once.
    if (value.data && typeof value.data === 'object') value = value.data;
    return value;
  };
  const stats = unwrap(statsResponse);
  let rating = {}, profile = {}, contests = {};
  try { if (ratingResponse) rating = unwrap(ratingResponse); } catch (_) {}
  try { if (profileResponse) profile = unwrap(profileResponse); } catch (_) {}
  try { if (contestsResponse) contests = unwrap(contestsResponse); } catch (_) {}
  const currentRating = firstNumber(rating.currentRating, rating.current_rating, rating.rating, rating.current, stats.currentRating, stats.current_rating, stats.rating, profile.rating);
  const highestRating = firstNumber(rating.highestRating, rating.highest_rating, rating.maxRating, rating.max_rating, rating.highest, stats.highestRating, stats.highest_rating, stats.maxRating, currentRating);
  const solved = firstNumber(stats.totalSolved, stats.total_solved, stats.totalProblemsSolved, stats.total_problems_solved, stats.fullySolved, stats.solved, stats.problemsSolved, stats.problems_solved, profile.totalSolved, profile.total_solved);
  const stars = profile.stars || profile.ratingStars || profile.rating_stars || profile.division || profile.rankTitle || stats.stars || stats.division || contests.rank || 'Unrated';
  const globalRank = firstNumber(contests.globalRanking, contests.globalRank, contests.global_rank, profile.globalRank, profile.global_rank, stats.globalRank, stats.global_rank);
  const countryRank = firstNumber(contests.countryRanking, contests.countryRank, contests.country_rank, profile.countryRank, profile.country_rank, stats.countryRank, stats.country_rank);
  if (!Object.keys(stats).length && !Object.keys(rating).length && !Object.keys(profile).length) throw new Error('CodeChef provider returned no profile data');
  return { handle, rating: currentRating, maxRating: highestRating, stars, globalRank, countryRank, solved };
}

app.disable('x-powered-by');
app.use(cors({ origin: process.env.APP_ORIGIN ? process.env.APP_ORIGIN.split(',').map(v => v.trim()) : true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
const rateBuckets = new Map();
function rateLimit({ windowMs = 15 * 60 * 1000, max = 30 } = {}) { return (req, res, next) => { const now = Date.now(); const key = req.ip + ':' + req.path; let bucket = rateBuckets.get(key); if (!bucket || bucket.until <= now) bucket = { count: 0, until: now + windowMs }; bucket.count++; rateBuckets.set(key, bucket); if (bucket.count > max) return res.status(429).json({ error: 'Too many requests. Please wait and try again.' }); next(); }; }
app.use(['/api/auth/login', '/api/auth/register', '/api/admin/login'], rateLimit({ max: 10 }));
app.use(['/api/sync/codeforces', '/api/sync/leetcode', '/api/sync/codechef', '/api/contests/upcoming'], rateLimit({ windowMs: 60 * 1000, max: 30 }));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); res.setHeader('X-Frame-Options', 'DENY'); next(); });
app.use((req, res, next) => {
  if (req.path === '/data/db.json' || req.path.startsWith('/data/')) return res.status(404).end();
  next();
});
app.use(express.static(__dirname));

// Database directory & file
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 40 CodeChef ~500 rated problems list
const DEFAULT_CODECHEF_500_PROBLEMS = [
  { code: 'FLOW001', name: 'Number Mirror', rating: 480, url: 'https://www.codechef.com/problems/FLOW001' },
  { code: 'START01', name: 'Number Mirror II', rating: 490, url: 'https://www.codechef.com/problems/START01' },
  { code: 'LUCKFOUR', name: 'Lucky Four', rating: 510, url: 'https://www.codechef.com/problems/LUCKFOUR' },
  { code: 'INTEST', name: 'Enormous Input Test', rating: 520, url: 'https://www.codechef.com/problems/INTEST' },
  { code: 'FSQRT', name: 'Finding Square Roots', rating: 495, url: 'https://www.codechef.com/problems/FSQRT' },
  { code: 'CIELRCPT', name: 'Ciel and Receipt', rating: 530, url: 'https://www.codechef.com/problems/CIELRCPT' },
  { code: 'HS08TEST', name: 'ATM', rating: 485, url: 'https://www.codechef.com/problems/HS08TEST' },
  { code: 'FLOW006', name: 'Sum of Digits', rating: 500, url: 'https://www.codechef.com/problems/FLOW006' },
  { code: 'FLOW002', name: 'Find Remainder', rating: 480, url: 'https://www.codechef.com/problems/FLOW002' },
  { code: 'FLOW004', name: 'First and Last Digit', rating: 505, url: 'https://www.codechef.com/problems/FLOW004' },
  { code: 'FLOW007', name: 'Reverse The Number', rating: 515, url: 'https://www.codechef.com/problems/FLOW007' },
  { code: 'CHOPRT', name: 'Chef And Operators', rating: 490, url: 'https://www.codechef.com/problems/CHOPRT' },
  { code: 'AMR15A', name: 'Mahasena', rating: 525, url: 'https://www.codechef.com/problems/AMR15A' },
  { code: 'REMISS', name: 'Chef and Remissness', rating: 510, url: 'https://www.codechef.com/problems/REMISS' },
  { code: 'TLG', name: 'The Lead Game', rating: 540, url: 'https://www.codechef.com/problems/TLG' },
  { code: 'DIFFSUM', name: 'Sum OR Difference', rating: 475, url: 'https://www.codechef.com/problems/DIFFSUM' },
  { code: 'DECINC', name: 'Decrement OR Increment', rating: 480, url: 'https://www.codechef.com/problems/DECINC' },
  { code: 'PALL01', name: 'The Block Game', rating: 510, url: 'https://www.codechef.com/problems/PALL01' },
  { code: 'FLOW010', name: 'Id and Ship', rating: 490, url: 'https://www.codechef.com/problems/FLOW010' },
  { code: 'FLOW013', name: 'Valid Triangles', rating: 505, url: 'https://www.codechef.com/problems/FLOW013' },
  { code: 'FLOW017', name: 'Second Largest', rating: 515, url: 'https://www.codechef.com/problems/FLOW017' },
  { code: 'FLOW018', name: 'Small Factorial', rating: 535, url: 'https://www.codechef.com/problems/FLOW018' },
  { code: 'FLOW008', name: 'Servant', rating: 495, url: 'https://www.codechef.com/problems/FLOW008' },
  { code: 'FLOW009', name: 'Total Expenses', rating: 510, url: 'https://www.codechef.com/problems/FLOW009' },
  { code: 'FLOW011', name: 'Gross Salary', rating: 520, url: 'https://www.codechef.com/problems/FLOW011' },
  { code: 'FLOW014', name: 'Grade The Steel', rating: 530, url: 'https://www.codechef.com/problems/FLOW014' },
  { code: 'FLOW016', name: 'GCD and LCM', rating: 525, url: 'https://www.codechef.com/problems/FLOW016' },
  { code: 'PRB01', name: 'Primality Test', rating: 540, url: 'https://www.codechef.com/problems/PRB01' },
  { code: 'LAPIN', name: 'Lapindromes', rating: 550, url: 'https://www.codechef.com/problems/LAPIN' },
  { code: 'PPSUM', name: 'Puppy and Sum', rating: 515, url: 'https://www.codechef.com/problems/PPSUM' },
  { code: 'HEADBOB', name: 'Tanu and Head-bob', rating: 520, url: 'https://www.codechef.com/problems/HEADBOB' },
  { code: 'TWOSTR', name: 'Chef and the Wildcard', rating: 535, url: 'https://www.codechef.com/problems/TWOSTR' },
  { code: 'TRISQ', name: 'Fit Squares in Triangle', rating: 545, url: 'https://www.codechef.com/problems/TRISQ' },
  { code: 'VOWELTB', name: 'Vowel or Consonant', rating: 470, url: 'https://www.codechef.com/problems/VOWELTB' },
  { code: 'AREAPERI', name: 'Area OR Perimeter', rating: 490, url: 'https://www.codechef.com/problems/AREAPERI' },
  { code: 'HOWMANY', name: 'How many digits do I have', rating: 500, url: 'https://www.codechef.com/problems/HOWMANY' },
  { code: 'CANDY123', name: 'Bear and Candies 123', rating: 530, url: 'https://www.codechef.com/problems/CANDY123' },
  { code: 'COPS', name: 'Cops and the Thief Devu', rating: 540, url: 'https://www.codechef.com/problems/COPS' },
  { code: 'FRUITS', name: 'Chef and Fruits', rating: 510, url: 'https://www.codechef.com/problems/FRUITS' },
  { code: 'CHN09', name: 'Malvika is peculiar', rating: 505, url: 'https://www.codechef.com/problems/CHN09' }
];

// Initial Daily Tasks
const DEFAULT_DAILY_TASKS = [
  {
    id: 'task-1',
    date: 'Today',
    title: 'LeetCode Daily: Longest Palindromic Substring',
    platform: 'LeetCode',
    difficulty: 'Medium',
    points: 50,
    problemCode: 'longest-palindromic-substring',
    url: 'https://leetcode.com/problems/longest-palindromic-substring/',
    completed: false
  },
  {
    id: 'task-2',
    date: 'Today',
    title: 'Codeforces Problem: 1840C - Ski Resort',
    platform: 'Codeforces',
    difficulty: '1100 Rating',
    points: 75,
    problemCode: '1840C',
    url: 'https://codeforces.com/problemset/problem/1840/C',
    completed: false
  },
  {
    id: 'task-3',
    date: 'Today',
    title: 'CodeChef Drill: LUCKFOUR (Lucky Four)',
    platform: 'CodeChef',
    difficulty: '510 Rating',
    points: 40,
    problemCode: 'LUCKFOUR',
    url: 'https://www.codechef.com/problems/LUCKFOUR',
    completed: false
  }
];

// Database state
let db = {
  users: [],
  tasks: DEFAULT_DAILY_TASKS,
  proProblems: DEFAULT_CODECHEF_500_PROBLEMS,
  customResources: [],
  vaultProblems: [],
  removedVaultProblemIds: []
};

// Normalize persisted state so older local/production records do not break newer routes.
function normalizeDBState() {
  if (!db || typeof db !== 'object') db = {};
  db.users = Array.isArray(db.users) ? db.users : [];
  db.tasks = Array.isArray(db.tasks) ? db.tasks : DEFAULT_DAILY_TASKS.map(t => ({ ...t }));
  db.proProblems = Array.isArray(db.proProblems) ? db.proProblems : DEFAULT_CODECHEF_500_PROBLEMS.map(p => ({ ...p }));
  db.customResources = Array.isArray(db.customResources) ? db.customResources : [];
  db.vaultProblems = Array.isArray(db.vaultProblems) ? db.vaultProblems : [];
  db.removedVaultProblemIds = Array.isArray(db.removedVaultProblemIds) ? db.removedVaultProblemIds : [];
  db.users = db.users.map(user => ({
    ...user,
    handles: { leetcode: '', codeforces: '', codechef: '', ...(user.handles || {}) },
    syncedStats: { leetcode: null, codeforces: null, codechef: null, ...(user.syncedStats || {}) },
    completedTasks: Array.isArray(user.completedTasks) ? user.completedTasks : [],
    solvedCodeChef500: Array.isArray(user.solvedCodeChef500) ? user.solvedCodeChef500 : [],
    customResources: Array.isArray(user.customResources) ? user.customResources : []
  }));
}

// Persistent storage: Neon PostgreSQL in production; JSON only for local development.
let sql = null;
let dbWriteQueue = Promise.resolve();
async function initializeDB() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters in production.');
    if (!process.env.ADMIN_KEY || process.env.ADMIN_KEY.length < 24) throw new Error('ADMIN_KEY must be at least 24 characters in production.');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production. Configure Neon PostgreSQL before deployment.');
  if (process.env.DATABASE_URL) {
    sql = neon(process.env.DATABASE_URL);
    await sql`CREATE TABLE IF NOT EXISTS topx_app_state (id integer PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
    const rows = await sql`SELECT data FROM topx_app_state WHERE id = 1`;
    if (rows.length) db = rows[0].data;
    else await sql`INSERT INTO topx_app_state (id, data) VALUES (1, ${JSON.stringify(db)}::jsonb) ON CONFLICT (id) DO NOTHING`;
    const latest = await sql`SELECT data FROM topx_app_state WHERE id = 1`;
    if (latest.length) db = latest[0].data;
    normalizeDBState();
    let migrated = false; (db.users || []).forEach(u => { if (u.password && !String(u.password).startsWith('scrypt$')) { u.password = hashPassword(String(u.password)); migrated = true; } });
    await sql`UPDATE topx_app_state SET data = ${JSON.stringify(db)}::jsonb, updated_at = now() WHERE id = 1`;
    return;
  }
  if (process.env.VERCEL) throw new Error('DATABASE_URL is required on Vercel. Configure a Neon PostgreSQL database.');
  if (fs.existsSync(DB_FILE)) {
    try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch (e) { console.error('Could not read local database; using clean defaults.', e.message); }
  }
  normalizeDBState();
  if (!fs.existsSync(DB_FILE)) saveDB();
  let migrated = false; (db.users || []).forEach(u => { if (u.password && !String(u.password).startsWith('scrypt$')) { u.password = hashPassword(String(u.password)); migrated = true; } });
  saveDB();
}
const dbReady = initializeDB();
function saveDB() {
  if (sql) {
    const snapshot = JSON.stringify(db);
    const write = dbWriteQueue.catch(() => {}).then(() => sql`INSERT INTO topx_app_state (id, data, updated_at) VALUES (1, ${snapshot}::jsonb, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`);
    dbWriteQueue = write.catch(err => { console.error('Database write failed:', err.message); throw err; });
    return dbWriteQueue;
  }
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }
  catch (e) { console.error('Local database write failed:', e.message); throw e; }
}
app.use(async (req, res, next) => {
  try { await dbReady; next(); }
  catch (err) { console.error('Database initialization failed:', err.message); res.status(503).json({ error: 'Database unavailable. Configure DATABASE_URL and redeploy.' }); }
});

// Signed, short-lived admin token. Never hard-code an admin secret in source.
function makeAdminToken() {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', String(process.env.ADMIN_KEY || '').trim()).update(payload).digest('base64url');
  return payload + '.' + signature;
}
function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 2 || !process.env.ADMIN_KEY) return res.status(401).json({ error: 'Admin authentication required.' });
  const expected = crypto.createHmac('sha256', String(process.env.ADMIN_KEY || '').trim()).update(parts[0]).digest();
  let supplied;
  try { supplied = Buffer.from(parts[1], 'base64url'); } catch (_) { return res.status(401).json({ error: 'Invalid admin token.' }); }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return res.status(401).json({ error: 'Invalid admin token.' });
  try { const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); if (payload.role !== 'admin' || payload.exp < Date.now()) throw new Error(); }
  catch (_) { return res.status(401).json({ error: 'Admin session expired. Sign in again.' }); }
  next();
}


function hashPassword(password) { const salt = crypto.randomBytes(16).toString('hex'); const hash = crypto.scryptSync(password, salt, 64).toString('hex'); return `scrypt$${salt}$${hash}`; }
function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  if (stored.startsWith('scrypt$')) { const parts = stored.split('$'); const actual = crypto.scryptSync(password, parts[1], 64); const expected = Buffer.from(parts[2], 'hex'); return actual.length === expected.length && crypto.timingSafeEqual(actual, expected); }
  return process.env.NODE_ENV !== 'production' && stored === password; // legacy demo credentials only in local development
}
function publicUser(user) { const { password, ...safe } = user; return safe; }
function makeUserToken(userId) {
  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? 'local-only-session-secret-change-before-deploy' : '');
  if (secret.length < 32) throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  return payload + '.' + crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}
function requireUserRequest(req, res, next) {
  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? 'local-only-session-secret-change-before-deploy' : '');
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 2 || secret.length < 32) return res.status(401).json({ error: 'Sign in to continue.' });
  const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest();
  let supplied; try { supplied = Buffer.from(parts[1], 'base64url'); } catch (_) { return res.status(401).json({ error: 'Invalid session.' }); }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return res.status(401).json({ error: 'Invalid session.' });
  let payload; try { payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); } catch (_) { return res.status(401).json({ error: 'Invalid session.' }); }
  if (!payload.sub || payload.exp < Date.now()) return res.status(401).json({ error: 'Session expired. Sign in again.' });
  const pathMatch = req.originalUrl.match(/\/(?:profile|handles|status|verify|daily)\/([^/?]+)|\/sync\/all\/([^/?]+)/);
  // The sync-all route mutates a member's saved stats, so enforce ownership there too.
  const matchedPathId = pathMatch && (pathMatch[1] || pathMatch[2]);
  const targetId = req.params.id || req.params.userId || matchedPathId || (req.body && req.body.userId);
  if (targetId && targetId !== payload.sub) return res.status(403).json({ error: 'You cannot access another member’s account.' });
  const user = db.users.find(u => u.id === payload.sub);
  if (!user) return res.status(401).json({ error: 'Account no longer exists. Sign in again.' });
  req.authUser = user;
  next();
}
// Validate the browser's stored session against the server on every app boot.
app.get('/api/auth/me', requireUserRequest, (req, res) => res.json({ user: publicUser(req.authUser) }));

// ---------------------------------------------------------------------------
// 1. AUTHENTICATION & PROFILE APIS
// ---------------------------------------------------------------------------

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, avatar } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  if (!cleanName || cleanName.length > 80 || !cleanEmail || cleanEmail.length > 254 || !password || String(password).length < 8 || String(password).length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Enter your name, a valid email, and a password between 8 and 200 characters.' });
  }

  const existing = db.users.find(u => String(u.email || '').toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const newUser = {
    id: 'user-' + crypto.randomUUID(),
    name: cleanName,
    email: cleanEmail,
    password: hashPassword(String(password)),
    avatar: typeof avatar === 'string' && /^https:\/\//i.test(avatar) ? avatar : '',
    college: 'Engineering Institute',
    isPro: false,
    proProgress: 0,
    handles: { leetcode: '', codeforces: '', codechef: '' },
    syncedStats: { leetcode: null, codeforces: null, codechef: null },
    completedTasks: [],
    solvedCodeChef500: []
  };

  db.users.push(newUser);
  await saveDB();

  res.status(201).json({ success: true, user: publicUser(newUser), token: makeUserToken(newUser.id) });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const user = db.users.find(u => String(u.email || '').toLowerCase() === cleanEmail && verifyPassword(String(password || ''), u.password));
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!String(user.password).startsWith('scrypt$')) { user.password = hashPassword(String(password)); await saveDB(); }
  res.json({ success: true, user: publicUser(user), token: makeUserToken(user.id) });
});

// Google OAuth requires a verified ID token; never trust a client-supplied email.
app.post('/api/auth/google', async (req, res) => res.status(501).json({ error: 'Google OAuth is not configured. Use email and password sign-in.' }));

// All member-specific endpoints require a valid signed session and enforce account ownership.
app.use('/api/user', requireUserRequest);
app.use('/api/sync/all', requireUserRequest);
app.use('/api/topx-pro', requireUserRequest);
app.use('/api/tasks', requireUserRequest);

// Get User Profile
app.get('/api/user/profile/:id', async (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

// Update Profile Info (Avatar, Name, Branch, Section)
app.put('/api/user/profile/:id', async (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, avatar, college, branch, section } = req.body || {};
  if (name !== undefined) {
    const cleanName = String(name).trim();
    if (!cleanName || cleanName.length > 80) return res.status(400).json({ error: 'Name must be between 1 and 80 characters.' });
    user.name = cleanName;
  }
  if (avatar !== undefined) {
    const cleanAvatar = String(avatar).trim();
    const isHttps = /^https:\/\//i.test(cleanAvatar);
    const isImageData = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(cleanAvatar) && cleanAvatar.length <= 2800000;
    if (cleanAvatar && !isHttps && !isImageData) return res.status(400).json({ error: 'Avatar must be an HTTPS URL or an image up to 2 MB.' });
    user.avatar = cleanAvatar;
  }
  if (college !== undefined) {
    const cleanCollege = String(college).trim();
    if (cleanCollege.length > 120) return res.status(400).json({ error: 'College name is too long.' });
    user.college = cleanCollege;
  }
  if (branch !== undefined) {
    const allowedBranches = ['CSE','IT','EI','EEE','CSBS','MECH','CIVIL','IP'];
    const cleanBranch = String(branch).trim().toUpperCase();
    if (cleanBranch && !allowedBranches.includes(cleanBranch)) return res.status(400).json({ error: 'Select a valid branch.' });
    user.branch = cleanBranch;
  }
  if (section !== undefined) {
    const cleanSection = String(section).trim().toUpperCase();
    if (cleanSection && !['A','B'].includes(cleanSection)) return res.status(400).json({ error: 'Select section A or B.' });
    user.section = cleanSection;
  }

  await saveDB();
  res.json({ success: true, user: publicUser(user) });
});

// Update Handles
app.put('/api/user/handles/:id', async (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { leetcode, codeforces, codechef } = req.body || {};
  const handles = { leetcode: String(leetcode || '').trim(), codeforces: String(codeforces || '').trim(), codechef: String(codechef || '').trim() };
  if (handles.leetcode.length > 50 || handles.codeforces.length > 24 || handles.codechef.length > 50) return res.status(400).json({ error: 'One or more platform handles are too long.' });
  user.handles = handles;

  await saveDB();
  res.json({ success: true, user: publicUser(user) });
});

// ---------------------------------------------------------------------------
// 2. LIVE PLATFORM API SYNC (Codeforces, LeetCode, CodeChef)
// ---------------------------------------------------------------------------

// Sync Codeforces
app.get('/api/sync/codeforces/:handle', async (req, res) => {
  const handle = req.params.handle;
  try {
    if (!/^[A-Za-z0-9_.-]{1,24}$/.test(handle)) return res.status(400).json({ error: 'Invalid Codeforces handle.' });
    const cfData = await fetchExternalJson(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);

    if (cfData.status === 'OK' && cfData.result && cfData.result.length > 0) {
      const u = cfData.result[0];
      const stats = {
        handle: u.handle,
        rating: Number(u.rating) || 0,
        maxRating: Number(u.maxRating) || 0,
        rank: u.rank || 'Newbie',
        maxRank: u.maxRank || 'Newbie',
        avatar: u.titlePhoto,
        contribution: u.contribution || 0
      };
      return res.json({ success: true, platform: 'codeforces', data: stats });
    }
  } catch (err) {
    console.warn('Codeforces live fetch fallback:', err.message);
  }

  return res.status(502).json({ error: 'Codeforces is temporarily unavailable or the handle was not found. No sample stats were substituted.' });
});

// Sync LeetCode
app.get('/api/sync/leetcode/:username', async (req, res) => {
  const username = req.params.username;
  try {
    // Try public LeetCode stats aggregator proxy
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(username)) return res.status(400).json({ error: 'Invalid LeetCode username.' });
    const lcData = await fetchExternalJson(`https://alfa-leetcode-api.onrender.com/userProfile/${encodeURIComponent(username)}`);
    if (lcData.errors || /user not found|invalid username/i.test(String(lcData.message || '')) || (!Number.isFinite(Number(lcData.totalSolved)) && !lcData.matchedUser)) throw new Error('LeetCode user not found');
    {

      const stats = {
        username: username,
        solved: Number(lcData.totalSolved) || 0,
        easy: Number(lcData.easySolved) || 0,
        medium: Number(lcData.mediumSolved) || 0,
        hard: Number(lcData.hardSolved) || 0,
        ranking: Number(lcData.ranking) || 0,
        rating: 0
      };
      return res.json({ success: true, platform: 'leetcode', data: stats });
    }
  } catch (err) {
    console.warn('LeetCode live fetch fallback:', err.message);
  }

  return res.status(502).json({ error: 'LeetCode stats are temporarily unavailable or the username was not found. No sample stats were substituted.' });
});

// Sync CodeChef
app.get('/api/sync/codechef/:handle', async (req, res) => {
  const handle = req.params.handle;
  try {
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(handle)) return res.status(400).json({ error: 'Invalid CodeChef handle.' });
    const stats = await fetchCodeChefStats(handle);
    return res.json({ success: true, platform: 'codechef', data: stats });
  } catch (err) {
    console.warn('CodeChef live fetch fallback:', err.message);
  }

  return res.status(502).json({ error: 'CodeChef is temporarily unavailable or the handle was not found. No sample stats were substituted.' });
});

// Sync All Platforms for a User
app.post('/api/sync/all/:id', async (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const h = user.handles || {};

  if (!h.leetcode && !h.codeforces && !h.codechef) return res.status(400).json({ error: 'Add at least one platform handle before syncing.' });
  const results = await Promise.allSettled([
    h.codeforces ? fetchExternalJson(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(h.codeforces)}`).then(async d => { if (d.status !== 'OK' || !d.result || !d.result[0]) throw new Error('Codeforces handle not found'); const u=d.result[0]; let solved=0; try { const subs=await fetchExternalJson(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(h.codeforces)}&from=1&count=10000`); if(subs.status==='OK'){ const seen=new Set(); subs.result.forEach(s=>{if(s.verdict==='OK'&&s.problem){seen.add([s.problem.contestId,s.problem.index].join('-'));}}); solved=seen.size; } } catch (_) {} return {handle:u.handle,rating:u.rating||0,maxRating:u.maxRating||0,rank:u.rank||'Unrated',maxRank:u.maxRank||'Unrated',acceptedProblemsLast10000:solved}; }) : Promise.resolve(null),
    h.leetcode ? fetchExternalJson(`https://alfa-leetcode-api.onrender.com/userProfile/${encodeURIComponent(h.leetcode)}`).then(d => { if (d.errors || d.message === 'user not found') throw new Error('LeetCode user not found'); return {username:h.leetcode,solved:Number(d.totalSolved)||0,easy:Number(d.easySolved)||0,medium:Number(d.mediumSolved)||0,hard:Number(d.hardSolved)||0,ranking:Number(d.ranking)||0}; }) : Promise.resolve(null),
    h.codechef ? fetchCodeChefStats(h.codechef) : Promise.resolve(null)
  ]);
  const names = ['codeforces','leetcode','codechef'];
  user.syncedStats = user.syncedStats || {};
  const errors = [];
  let successfulPlatforms = 0;
  results.forEach((result, i) => {
    const platform = names[i];
    const requested = Boolean(h[platform]);
    if (!requested) return;
    if (result.status === 'fulfilled' && result.value) {
      user.syncedStats[platform] = result.value;
      successfulPlatforms++;
    } else {
      // Never leave stale stats displayed as if they were freshly synced.
      user.syncedStats[platform] = null;
      errors.push(platform + ': ' + (result.status === 'rejected' ? result.reason.message : 'No data returned by provider'));
    }
  });
  user.syncErrors = errors;
  if (successfulPlatforms > 0) user.lastSyncedAt = new Date().toISOString();
  await saveDB();
  if (successfulPlatforms === 0) return res.status(502).json({ error: 'Could not sync any connected platform. Check the usernames and try again later.', details: errors, user: publicUser(user) });
  res.json({ success: true, user: publicUser(user), errors });
});

// ---------------------------------------------------------------------------
// 3. TOP-X PRO & 40 CODECHEF 500-RATED TASKS APIS
// ---------------------------------------------------------------------------

// Get Pro Status & Problems
app.get('/api/topx-pro/status/:userId', async (req, res) => {
  const user = db.users.find(u => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const userSolved = new Set(user.solvedCodeChef500 || []);

  const problemsList = db.proProblems.map(p => ({
    ...p,
    isSolved: userSolved.has(p.code)
  }));

  res.json({
    isPro: user.isPro || false,
    verificationStatus: user.proVerificationStatus || 'not_requested',
    verificationRequestedAt: user.proVerificationRequestedAt || null,
    completedCount: userSolved.size,
    totalRequired: 40,
    progressPct: Math.min(100, Math.round((userSolved.size / 40) * 100)),
    problems: problemsList
  });
});

// Verify & Unlock Pro
app.post('/api/topx-pro/verify/:userId', async (req, res) => {
  const user = db.users.find(u => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.handles.codechef) {
    return res.status(400).json({ error: 'Please connect your CodeChef handle first' });
  }

  if (user.isPro) return res.json({ success: true, isPro: true, verificationStatus: 'approved', message: 'Your Top-X Pro membership is already active.' });
  if (user.proVerificationStatus !== 'pending') {
    user.proVerificationStatus = 'pending';
    user.proVerificationRequestedAt = new Date().toISOString();
    await saveDB();
  }
  return res.status(202).json({ success: true, isPro: false, verificationStatus: 'pending', message: 'Your Pro request was submitted for manual admin review. Completion is not automatically verified by the API.' });
});

// ---------------------------------------------------------------------------
// 4. DAILY MEMBER TASKS APIS
// ---------------------------------------------------------------------------


// Automatic, server-side task verification. Never trust a browser-provided
// "completed" flag; a task is complete only after a provider confirms an AC.
function getTaskCode(task) {
  const platform = String(task.platform || '').toLowerCase();
  const rawCode = String(task.problemCode || '').trim();
  const url = String(task.url || '');
  if (platform === 'codeforces') {
    const m = url.match(/\/(?:problemset\/problem|gym)\/(\d+)\/([A-Za-z]\d*)/i);
    const code = rawCode.match(/^(\d+)[\s_-]*([A-Za-z]\d*)$/i);
    if (m) return { contestId: m[1], index: m[2].toUpperCase() };
    if (code) return { contestId: code[1], index: code[2].toUpperCase() };
    return null;
  }
  if (platform === 'leetcode') {
    const m = url.match(/leetcode\.com\/problems\/([^/?#]+)/i);
    const slug = (m ? m[1] : rawCode).toLowerCase();
    return /^[a-z0-9-]+$/.test(slug) ? slug : null;
  }
  if (platform === 'codechef') {
    const m = url.match(/codechef\.com\/(?:problems|practice\/problems)\/([^/?#]+)/i);
    const code = (m ? m[1] : rawCode).toUpperCase();
    return /^[A-Z0-9_]+$/.test(code) ? code : null;
  }
  return null;
}

async function getCodeforcesAccepted(handle) {
  if (!handle) return null;
  if (!/^[A-Za-z0-9_.-]{1,24}$/.test(handle)) throw new Error('Invalid Codeforces handle');
  const data = await fetchExternalJson(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`);
  if (data.status !== 'OK' || !Array.isArray(data.result)) throw new Error('Codeforces submissions are unavailable');
  const solved = new Set();
  for (const submission of data.result) {
    if (submission && submission.verdict === 'OK' && submission.problem && submission.problem.contestId != null && submission.problem.index) {
      solved.add(String(submission.problem.contestId) + ':' + String(submission.problem.index).toUpperCase());
    }
  }
  return solved;
}

async function getLeetCodeAcceptedSlugs(username) {
  if (!username) return null;
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(username)) throw new Error('Invalid LeetCode username');
  const response = await fetch('https://leetcode.com/graphql/', {
    method: 'POST',
    signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Referer': 'https://leetcode.com/' },
    body: JSON.stringify({
      query: 'query recentAcSubmissionList($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { title titleSlug statusDisplay timestamp } }',
      variables: { username, limit: 100 }
    })
  });
  if (!response.ok) { if (response.status === 429) throw new Error('LeetCode is rate-limiting requests (HTTP 429). Wait a few minutes before retrying.'); throw new Error('LeetCode submissions are temporarily unavailable (HTTP ' + response.status + ')'); }
  const data = await response.json();
  const rows = data && data.data && data.data.recentAcSubmissionList;
  if (!Array.isArray(rows)) throw new Error('LeetCode did not return a verifiable submissions list');
  return new Set(rows.filter(x => x && String(x.statusDisplay).toLowerCase() === 'accepted' && x.titleSlug).map(x => String(x.titleSlug).toLowerCase()));
}

async function getCodeChefAcceptedCodes(handle) {
  if (!handle) return null;
  if (!/^[A-Za-z0-9_.-]{1,50}$/.test(handle)) throw new Error('Invalid CodeChef handle');
  const solved = new Set();
  const errors = [];

  // Provider A: legacy community endpoint (some deployments moved to /handle/:handle).
  const providers = [
    'https://codechef-api.vercel.app/handle/' + encodeURIComponent(handle),
    'https://codechef-api-peach.vercel.app/get/' + encodeURIComponent(handle)
  ];
  for (const endpoint of providers) {
    try {
      const data = await fetchExternalJson(endpoint);
      if (!data || typeof data !== 'object' || data.error || data.success === false) throw new Error(String(data && (data.error || data.message) || 'Invalid provider response'));
      const responseHandle = String(data.username || data.handle || data.userName || '').toLowerCase();
      if (responseHandle && responseHandle !== handle.toLowerCase()) throw new Error('Provider returned data for a different CodeChef handle');
      const visited = new Set(); let candidates = 0;
      const codeFrom = (item) => {
        if (!item || typeof item !== 'object') return null;
        const link = String(item.link || item.url || item.problem_url || item.problemUrl || item.href || '');
        const match = link.match(/codechef\.com\/(?:problems|practice\/problems)\/([^/?#]+)/i);
        const code = item.code || item.problemCode || item.problem_code || item.problemCodeName || (match && match[1]);
        return code ? String(code).trim().toUpperCase() : null;
      };
      const walk = (node, depth) => {
        if (!node || depth > 10 || typeof node !== 'object' || visited.has(node)) return;
        visited.add(node);
        if (Array.isArray(node)) {
          for (const item of node) {
            if (item && typeof item === 'object') {
              const code = codeFrom(item);
              const verdict = String(item.verdict || item.status || item.result || item.statusDisplay || '').toLowerCase();
              const hasProblemShape = Boolean(item.link || item.url || item.problem_url || item.problemUrl || item.problemCode || item.problem_code || (item.code && (item.name || item.title || item.problemName || item.problem_name)));
              if (code && hasProblemShape && (!verdict || /accepted|\bac\b|success/.test(verdict))) { solved.add(code); candidates++; }
            }
            walk(item, depth + 1);
          }
          return;
        }
        for (const [key, value] of Object.entries(node)) {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const keyLooksLikeCode = /^[A-Z][A-Z0-9_]{2,30}$/i.test(key);
            const hasProblemShape = Boolean(value.link || value.url || value.name || value.title || value.problemName || value.problem_name);
            if (keyLooksLikeCode && hasProblemShape) { solved.add(key.toUpperCase()); candidates++; }
          }
          walk(value, depth + 1);
        }
      };
      walk(data.problems || data.solvedProblems || data.solved_problems || data.acceptedProblems || data.accepted_problems || data.solved || data.data || data, 0);
      if (candidates > 0) return solved;
      errors.push(endpoint + ': response did not include per-problem accepted data');
    } catch (err) { errors.push(endpoint + ': ' + (err.message || 'request failed')); }
  }

  // Provider B fallback: CodeChef's public recent-submissions XHR. This checks
  // individual rows and only accepts rows explicitly marked Accepted/AC.
  // It intentionally fails closed if the upstream HTML format changes.
  let pagesRead = 0;
  for (let page = 0; page < 10; page++) {
    const url = 'https://www.codechef.com/recent/user?user_handle=' + encodeURIComponent(handle) + '&page=' + page;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
        headers: { 'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://www.codechef.com/users/' + encodeURIComponent(handle), 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' }
      });
      if (!response.ok) throw new Error('CodeChef recent submissions returned HTTP ' + response.status);
      const payload = await response.json();
      const html = String(payload && (payload.content || payload.html || payload.data && payload.data.content) || '');
      if (!html) { if (page === 0) throw new Error('CodeChef returned no recent-submission rows'); break; }
      pagesRead++;
      const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
      for (const row of rows) {
        const accepted = /(?:title=["'][^"']*accepted[^"']*["']|class=["'][^"']*(?:text-success|accepted|status-accepted)[^"']*["']|>\s*(?:Accepted|AC)\s*<)/i.test(row);
        if (!accepted) continue;
        const links = [...row.matchAll(/href=["'][^"']*codechef\.com\/(?:problems|practice\/problems)\/([^"'/?#]+)[^"']*["']/gi)];
        const code = links.length ? decodeURIComponent(links[0][1]).toUpperCase() : null;
        if (code && /^[A-Z0-9_]+$/.test(code)) solved.add(code);
      }
      if (rows.length === 0 || !/href=["'][^"']*page=|pagination|next/i.test(html)) break;
    } catch (err) {
      errors.push('CodeChef recent submissions: ' + (err.message || 'request failed'));
      break;
    }
  }
  if (pagesRead > 0) return solved;
  throw new Error('Could not verify CodeChef accepted problems. ' + errors.join(' | '));
}

function topxIndiaDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function previousDateISO(isoDate) {
  const parts = isoDate.split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] - 1));
  return d.toISOString().slice(0, 10);
}
function refreshUserStreak(user, newlyVerified) {
  if (!newlyVerified) return;
  const today = topxIndiaDate();
  if (user.lastStreakDate === today) return;
  user.currentStreak = user.lastStreakDate === previousDateISO(today)
    ? Math.max(0, Number(user.currentStreak) || 0) + 1
    : 1;
  user.longestStreak = Math.max(Number(user.longestStreak) || 0, user.currentStreak);
  user.lastStreakDate = today;
  user.streakUpdatedAt = new Date().toISOString();
}
function calculateCurrentStreak(user) {
  const today = topxIndiaDate();
  const yesterday = previousDateISO(today);
  if (user.lastStreakDate !== today && user.lastStreakDate !== yesterday) return 0;
  return Math.max(0, Number(user.currentStreak) || 0);
}

async function verifyTasksForUser(user) {
  const tasks = db.tasks || [];
  const relevant = tasks.filter(task => user.handles && user.handles[String(task.platform || '').toLowerCase()]);
  const byPlatform = {};
  const errors = [];
  const platforms = [...new Set(relevant.map(t => String(t.platform || '').toLowerCase()))];
  await Promise.all(platforms.map(async platform => {
    try {
      const handle = user.handles[platform];
      if (platform === 'codeforces') byPlatform[platform] = await getCodeforcesAccepted(handle);
      else if (platform === 'leetcode') byPlatform[platform] = await getLeetCodeAcceptedSlugs(handle);
      else if (platform === 'codechef') byPlatform[platform] = await getCodeChefAcceptedCodes(handle);
      else byPlatform[platform] = null;
    } catch (err) {
      byPlatform[platform] = null;
      errors.push(platform + ': ' + (err && err.message ? err.message : 'verification unavailable'));
    }
  }));

  user.verifiedTasks = user.verifiedTasks || {};
  let newlyVerified = 0;
  for (const task of relevant) {
    const platform = String(task.platform || '').toLowerCase();
    const source = byPlatform[platform];
    const target = getTaskCode(task);
    let verified = false;
    if (source && target) {
      if (platform === 'codeforces') verified = source.has(target.contestId + ':' + target.index);
      else verified = source.has(target);
    }
    if (verified) {
      const wasVerified = !!(user.verifiedTasks[task.id] && user.verifiedTasks[task.id].verified);
      user.verifiedTasks[task.id] = { verified: true, platform, problemCode: typeof target === 'string' ? target : target.contestId + target.index, verifiedAt: new Date().toISOString() };
      if (!wasVerified) newlyVerified++;
    } else if (!user.verifiedTasks[task.id] || !user.verifiedTasks[task.id].verified) {
      user.verifiedTasks[task.id] = { verified: false, platform, checkedAt: new Date().toISOString(), reason: source ? 'Accepted submission not found yet' : 'Platform verification unavailable' };
    }
  }
  // Keep legacy field synchronized only from server-verified tasks.
  const verifiedIds = Object.keys(user.verifiedTasks).filter(id => user.verifiedTasks[id] && user.verifiedTasks[id].verified);
  user.completedTasks = verifiedIds;
  refreshUserStreak(user, newlyVerified);
  user.lastTaskVerificationAt = new Date().toISOString();
  await saveDB();
  return { newlyVerified, errors, currentStreak: calculateCurrentStreak(user), longestStreak: Number(user.longestStreak) || 0 };
}

// Get Daily Tasks
app.get('/api/tasks/daily/:userId', async (req, res) => {
  const user = db.users.find(u => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const tasksWithStatus = db.tasks.map(t => {
    const verification = user.verifiedTasks && user.verifiedTasks[t.id];
    return { ...t, isCompleted: !!(verification && verification.verified), verification: verification || null };
  });
  res.json({
    tasks: tasksWithStatus,
    lastVerificationAt: user.lastTaskVerificationAt || null,
    streak: { current: calculateCurrentStreak(user), longest: Number(user.longestStreak) || 0, lastVerifiedDate: user.lastStreakDate || null }
  });
});

// Triggered automatically by the client on task-page load/refresh and periodically.
// The signed-in user can only verify their own tasks.
app.post('/api/tasks/verify-all/:userId', async (req, res) => {
  const user = db.users.find(u => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  try {
    const result = await verifyTasksForUser(user);
    res.json({ success: true, newlyVerified: result.newlyVerified, errors: result.errors, lastVerificationAt: user.lastTaskVerificationAt, streak: { current: calculateCurrentStreak(user), longest: Number(user.longestStreak) || 0, lastVerifiedDate: user.lastStreakDate || null } });
  } catch (err) {
    console.error('Automatic task verification failed:', err.message);
    res.status(502).json({ error: 'Could not verify submissions right now. Try refreshing tasks later.' });
  }
});

// Legacy endpoint: never accept a client claim as proof of completion.
app.post('/api/tasks/verify', async (req, res) => {
  const user = req.authUser;
  const taskId = String((req.body || {}).taskId || '');
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const result = await verifyTasksForUser(user);
  const verification = user.verifiedTasks && user.verifiedTasks[taskId];
  if (!verification || !verification.verified) {
    return res.status(409).json({ success: false, verified: false, error: 'No accepted submission was found for this task on your connected platform. Completion was not marked.' , details: result.errors });
  }
  return res.json({ success: true, verified: true, message: 'Accepted submission verified automatically.', verification });
});

// Problem Vault dynamic content. Built-in problems remain in js/data.js; the
// server persists admin-added problems and removals so changes survive reloads.
app.get('/api/vault/problems', async (req, res) => {
  await dbReady;
  res.json({ problems: db.vaultProblems || [], removedIds: db.removedVaultProblemIds || [] });
});

// ---------------------------------------------------------------------------
// 5. SECURE ADMIN CONSOLE APIS
// ---------------------------------------------------------------------------

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  // Accept either the raw secret or a pasted `ADMIN_KEY=secret` line.
  // Never return the secret itself in errors or diagnostics.
  let key = typeof req.body?.key === 'string' ? req.body.key.trim() : '';
  if (key.startsWith('ADMIN_KEY=')) key = key.slice('ADMIN_KEY='.length).trim();
  if (key.length >= 2 && ((key.startsWith('\"') && key.endsWith('\"')) || (key.startsWith("'") && key.endsWith("'")))) {
    key = key.slice(1, -1);
  }
  const configuredValue = typeof process.env.ADMIN_KEY === 'string' ? process.env.ADMIN_KEY.trim() : '';
  const production = process.env.NODE_ENV === 'production';
  if (!configuredValue || (production && configuredValue.length < 24)) {
    return res.status(503).json({ error: 'Admin login is not configured. In production, ADMIN_KEY must be at least 24 characters. For local development, set ADMIN_KEY in .env and restart the server.' });
  }
  const suppliedKey = Buffer.from(key);
  const configuredKey = Buffer.from(configuredValue);
  if (key && suppliedKey.length === configuredKey.length && crypto.timingSafeEqual(suppliedKey, configuredKey)) {
    return res.json({ success: true, token: makeAdminToken(), expiresIn: 8 * 60 * 60 });
  }
  const error = 'Invalid admin security credentials.';
  if (process.env.NODE_ENV !== 'production') {
    return res.status(401).json({ error, hint: 'The key entered does not match the key loaded by this server. Confirm .env is beside server.js, save it, stop all old Node servers, and restart npm start.', receivedLength: key.length, configuredLength: configuredValue.length });
  }
  return res.status(401).json({ error });
});

// All admin data and mutation routes require the signed admin session.
app.use('/api/admin', (req, res, next) => { if (req.path === '/login' && req.method === 'POST') return next(); return requireAdmin(req, res, next); });

// Admin Overview
app.get('/api/admin/overview', async (req, res) => {
  const totalUsers = db.users.length;
  const proUsers = db.users.filter(u => u.isPro).length;
  const totalTasks = db.tasks.length;
  const totalProProblems = db.proProblems.length;

  res.json({
    totalUsers,
    proUsers,
    totalTasks,
    totalProProblems,
    users: db.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isPro: u.isPro,
      handles: u.handles,
      proProgress: u.proProgress,
      proVerificationStatus: u.proVerificationStatus || 'not_requested',
      proVerificationRequestedAt: u.proVerificationRequestedAt || null
    }))
  });
});

// Add Task (Admin)
app.post('/api/admin/tasks', async (req, res) => {
  const { title, platform, difficulty, points, problemCode, url } = req.body;
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Task title is required.' });
  if (url && !/^https:\/\//i.test(url)) return res.status(400).json({ error: 'Task URL must use HTTPS.' });
  const newTask = {
    id: 'task-' + Date.now(),
    date: 'Today',
    title: title || 'New Daily Drill',
    platform: platform || 'LeetCode',
    difficulty: difficulty || 'Medium',
    points: parseInt(points, 10) || 50,
    problemCode: problemCode || 'challenge',
    url: url || 'https://leetcode.com',
    completed: false
  };

  db.tasks.unshift(newTask);
  await saveDB();
  res.json({ success: true, task: newTask });
});

// List tasks for the authenticated admin content manager.
app.get('/api/admin/tasks', async (req, res) => { res.json({ tasks: db.tasks || [] }); });

// Delete Task (Admin)
app.delete('/api/admin/tasks/:id', async (req, res) => {
  db.tasks = db.tasks.filter(t => t.id !== req.params.id);
  await saveDB();
  res.json({ success: true });
});

// List persisted resources for the admin console.
app.get('/api/admin/resources', async (req, res) => { res.json({ resources: db.customResources || [] }); });

// Add Resource / Guide (Admin)
app.post('/api/admin/resources', async (req, res) => {
  const { title, type, time, desc, link } = req.body;
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Resource title is required.' });
  if (link && !/^https:\/\//i.test(link)) return res.status(400).json({ error: 'Resource link must use HTTPS.' });
  const newRes = {
    id: 'res-' + Date.now(),
    title,
    type: type || 'Article',
    time: time || '10 min',
    desc,
    link: link || '#'
  };

  db.customResources.unshift(newRes);
  await saveDB();
  res.json({ success: true, resource: newRes });
});

app.delete('/api/admin/resources/:id', async (req, res) => {
  const before = db.customResources.length;
  db.customResources = db.customResources.filter(item => item.id !== req.params.id);
  if (db.customResources.length === before) return res.status(404).json({ error: 'Resource not found.' });
  await saveDB();
  res.json({ success: true });
});

app.get('/api/admin/vault/problems', async (req, res) => {
  res.json({ problems: db.vaultProblems || [], removedIds: db.removedVaultProblemIds || [] });
});

app.post('/api/admin/vault/problems', async (req, res) => {
  const body = req.body || {};
  const title = String(body.title || '').trim();
  const url = String(body.url || '').trim();
  const categoryName = String(body.categoryName || 'General').trim();
  const difficulty = Number(body.difficulty);
  if (!title) return res.status(400).json({ error: 'Problem title is required.' });
  if (!/^https:\/\//i.test(url)) return res.status(400).json({ error: 'Problem URL must use HTTPS.' });
  if (![1, 2, 3].includes(difficulty)) return res.status(400).json({ error: 'Choose Easy, Medium, or Hard.' });
  if (title.length > 140 || categoryName.length > 50 || url.length > 500) return res.status(400).json({ error: 'One or more fields are too long.' });
  const slug = String(body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 100) || ('custom-' + Date.now());
  if ((db.vaultProblems || []).some(p => p.slug === slug) || (db.removedVaultProblemIds || []).includes(slug)) return res.status(409).json({ error: 'A problem with this identifier already exists.' });
  const category = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general';
  const problem = { id: 'vault-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'), title, slug, url, category, categoryName, difficulty, companies: Array.isArray(body.companies) ? body.companies.map(String).slice(0, 8) : [], intuition: String(body.intuition || '').slice(0, 500) };
  db.vaultProblems.unshift(problem);
  await saveDB();
  res.json({ success: true, problem });
});

app.delete('/api/admin/vault/problems/:id', async (req, res) => {
  const id = String(req.params.id || '');
  const custom = (db.vaultProblems || []).find(p => p.id === id || p.slug === id);
  if (custom) {
    db.vaultProblems = db.vaultProblems.filter(p => p.id !== custom.id);
  } else {
    if (!/^[a-z0-9-]{1,120}$/i.test(id)) return res.status(400).json({ error: 'Invalid problem identifier.' });
    db.removedVaultProblemIds = Array.isArray(db.removedVaultProblemIds) ? db.removedVaultProblemIds : [];
    if (!db.removedVaultProblemIds.includes(id)) db.removedVaultProblemIds.push(id);
  }
  await saveDB();
  res.json({ success: true });
});

// Toggle User Pro Status (Admin)
app.post('/api/admin/toggle-pro', async (req, res) => {
  const { userId, isPro } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.isPro = isPro !== undefined ? isPro : !user.isPro;
    user.proVerificationStatus = user.isPro ? 'approved' : 'revoked';
    await saveDB();
    return res.json({ success: true, user: publicUser(user) });
  }
  res.status(404).json({ error: 'User not found' });
});

// Leaderboard is based only on registered members and their last successfully synced platform data.
app.get('/api/leaderboard', async (req, res) => {
  const members = db.users.map(u => {
    const stats = u.syncedStats || {};
    const solved = Number((stats.leetcode && stats.leetcode.solved) || (stats.codechef && stats.codechef.solved) || 0);
    const rating = Number((stats.codeforces && stats.codeforces.rating) || (stats.codechef && stats.codechef.rating) || 0);
    const currentStreak = calculateCurrentStreak(u);
    return {
      id: u.id, n: String(u.name || 'Member'), s: solved, k: rating,
      b: 'Member', y: 1, c: '—', isPro: !!u.isPro,
      streak: currentStreak, longestStreak: Number(u.longestStreak) || 0,
      verifiedTasks: Array.isArray(u.completedTasks) ? u.completedTasks.length : 0
    };
  }).sort((a, b) => b.streak - a.streak || b.verifiedTasks - a.verifiedTasks || b.s - a.s || b.k - a.k);
  res.setHeader('Cache-Control', 'private, max-age=30');
  res.json({ members });
});

// Live upcoming contest schedule from the official Codeforces API.
app.get('/api/contests/upcoming', async (req, res) => {
  try {
    const data = await fetchExternalJson('https://codeforces.com/api/contest.list?gym=false');
    if (data.status !== 'OK' || !Array.isArray(data.result)) throw new Error('Unexpected Codeforces response');
    const contests = data.result.filter(c => c.phase === 'BEFORE' && Number(c.startTimeSeconds) > Math.floor(Date.now() / 1000))
      .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds).slice(0, 5)
      .map(c => ({ id: c.id, name: c.name, type: c.type, phase: c.phase, startTimeSeconds: c.startTimeSeconds, durationSeconds: c.durationSeconds }));
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    res.json({ source: 'Codeforces API', contests });
  } catch (err) {
    res.status(502).json({ error: 'Could not fetch the official Codeforces contest schedule. Try again later.' });
  }
});

app.get('/api/health', async (req, res) => { await dbReady; res.json({ ok: true, storage: sql ? 'postgres' : 'local-json', adminConfigured: Boolean(String(process.env.ADMIN_KEY || '').trim() && (process.env.NODE_ENV !== 'production' || String(process.env.ADMIN_KEY || '').trim().length >= 24)), timestamp: new Date().toISOString() }); });

app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err && err.message ? err.message : err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Unexpected server error. Please try again.' });
});

// Vercel imports the Express app as a serverless function; local development listens on PORT.
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Top-X running at http://localhost:${PORT}`));
}
module.exports = app;
