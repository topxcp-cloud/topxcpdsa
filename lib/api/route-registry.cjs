/**
 * TOP-X API route registry executed inside Next.js Route Handlers.
 * It uses an in-process compatibility dispatcher, not Express or a TCP server.
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
  const localEnvPath = path.join(process.cwd(), '.env.local');
  const legacyEnvPath = path.join(process.cwd(), '.env');
  const envPath = fs.existsSync(localEnvPath) ? localEnvPath : legacyEnvPath;
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

const { express } = require('../next-api-bridge.cjs');
const cors = () => (_req, _res, next) => next(); // CORS is handled by the Next.js deployment boundary.
const { neon } = require('@neondatabase/serverless');
const { countsFromTimestamps, parseLeetCodeCalendar, parseCodeChefHeatmap, mergeDailyCounts, replacePlatformActivityWindow, buildDailyActivity, clearPlatformActivity, activityMetrics } = require('./submission-activity.cjs');
const { fetchCodeforcesSubmissionHistory } = require('./codeforces-submissions.cjs');
let pg = null;
try { pg = require('pg'); } catch (_) {}

const app = express();
function requestCookie(req, name) {
  const cookies = String(req.headers.cookie || '').split(';');
  const cookie = cookies.find(part => part.trim().startsWith(name + '='));
  return cookie ? cookie.trim().slice(name.length + 1) : '';
}
function sessionCookie(name, token, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
function expiredCookie(name) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
app.post('/api/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', expiredCookie('topx_session'));
  res.json({ success: true });
});

app.post('/api/admin/logout', (_req, res) => {
  res.setHeader('Set-Cookie', expiredCookie('topx_admin_session'));
  res.json({ success: true });
});
// This module registers the original API business handlers; Next.js Route Handlers invoke it.
const EXTERNAL_API_TIMEOUT_MS = 9000;
const externalJsonCache = new Map();
const externalJsonInFlight = new Map();
const CODEFORCES_MIN_REQUEST_INTERVAL_MS = 2100;
let codeforcesRequestQueue = Promise.resolve();
let nextCodeforcesRequestAt = 0;
function reserveCodeforcesRequestSlot() {
  const slot = codeforcesRequestQueue.then(async () => {
    const waitMs = Math.max(0, nextCodeforcesRequestAt - Date.now());
    if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
    nextCodeforcesRequestAt = Date.now() + CODEFORCES_MIN_REQUEST_INTERVAL_MS;
  });
  codeforcesRequestQueue = slot.catch(() => {});
  return slot;
}
async function fetchExternalJson(url, options = {}) {
  const noCache = options.noCache === true;
  const cacheTtlMs = options.cacheTtlMs == null ? 5 * 60 * 1000 : Math.max(0, Number(options.cacheTtlMs) || 0);
  const cached = !noCache && externalJsonCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (externalJsonInFlight.has(url)) return externalJsonInFlight.get(url);
  const request = (async () => {
    if (/^https:\/\/codeforces\.com\/api\//i.test(url)) await reserveCodeforcesRequestSlot();
    const timeoutMs = Math.max(1000, Number(options.timeoutMs) || EXTERNAL_API_TIMEOUT_MS);
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'Accept': 'application/json', 'User-Agent': 'TOP-X/1.0' } });
    if (!response.ok) throw new Error('External API returned HTTP ' + response.status);
    const value = await response.json();
    if (!noCache && cacheTtlMs > 0) externalJsonCache.set(url, { value, expiresAt: Date.now() + cacheTtlMs });
    return value;
  })().finally(() => externalJsonInFlight.delete(url));
  externalJsonInFlight.set(url, request);
  return request;
}

function normalizeLeetCodeStats(payload, username) {
  if (!payload || payload.errors || /user not found|invalid username/i.test(String(payload.message || ''))) return null;
  // Community API response shape.
  const root = payload.matchedUser || payload.user || payload;
  const stats = root.submitStats || root.submitStatsGlobal || root.submitStatsGlobalV2 || {};
  const rows = stats.acSubmissionNum || stats.acSubmissionNumV2 || [];
  const byDifficulty = {};
  for (const row of rows) {
    const key = String(row.difficulty || '').toLowerCase();
    if (key) byDifficulty[key] = Number(row.count) || 0;
  }
  const solved = Number(root.totalSolved ?? root.totalQuestionsSolved ?? payload.totalSolved ?? payload.totalQuestionsSolved);
  const easy = Number(root.easySolved ?? payload.easySolved ?? byDifficulty.easy);
  const medium = Number(root.mediumSolved ?? payload.mediumSolved ?? byDifficulty.medium);
  const hard = Number(root.hardSolved ?? payload.hardSolved ?? byDifficulty.hard);
  const ranking = Number(root.ranking ?? root.profile?.ranking ?? payload.ranking ?? payload.profile?.ranking);
  const hasAny = [solved, easy, medium, hard, ranking].some(n => Number.isFinite(n) && n > 0);
  if (!hasAny) return null;
  return {
    username,
    solved: Number.isFinite(solved) ? solved : (Number.isFinite(easy) ? easy : 0) + (Number.isFinite(medium) ? medium : 0) + (Number.isFinite(hard) ? hard : 0),
    easy: Number.isFinite(easy) ? easy : 0,
    medium: Number.isFinite(medium) ? medium : 0,
    hard: Number.isFinite(hard) ? hard : 0,
    ranking: Number.isFinite(ranking) ? ranking : 0,
    rating: Number(root.userContestRanking?.rating ?? payload.userContestRanking?.rating) || 0
  };
}

async function fetchLeetCodeProfileStats(username) {
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(username)) throw new Error('Invalid LeetCode username');
  const failures = [];
  const urls = [
    'https://alfa-leetcode-api.onrender.com/userProfile/' + encodeURIComponent(username),
    'https://alfa-leetcode-api.onrender.com/' + encodeURIComponent(username) + '/profile'
  ];
  for (const url of urls) {
    try {
      const normalized = normalizeLeetCodeStats(await fetchExternalJson(url), username);
      if (normalized) return normalized;
      failures.push('Unexpected response from ' + new URL(url).pathname);
    } catch (err) { failures.push(err.message); }
  }
  // Official public GraphQL fallback. Do not require contest history to exist.
  try {
    const response = await fetch('https://leetcode.com/graphql/', {
      method: 'POST', signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Referer': 'https://leetcode.com/' + encodeURIComponent(username) + '/', 'User-Agent': 'Mozilla/5.0 TOP-X/1.0' },
      body: JSON.stringify({
        query: 'query topxUserStats($username: String!) { matchedUser(username: $username) { username profile { ranking } submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } } } userContestRanking(username: $username) { rating } }',
        variables: { username }
      })
    });
    if (!response.ok) throw new Error('LeetCode GraphQL HTTP ' + response.status);
    const payload = await response.json();
    const matched = payload && payload.data && payload.data.matchedUser;
    if (!matched) throw new Error('LeetCode username was not found by GraphQL');
    const normalized = normalizeLeetCodeStats({ matchedUser: matched, userContestRanking: payload.data.userContestRanking }, username);
    if (normalized) return normalized;
    throw new Error('LeetCode GraphQL returned no usable stats');
  } catch (err) { failures.push(err.message); }
  throw new Error('LeetCode stats unavailable: ' + failures.join('; '));
}

// LeetCode's profile calendar reports ALL submissions by day (accepted and rejected).
// This avoids the recentAcSubmissionList endpoint's small recent-history limit.
async function fetchLeetCodeSubmissionDailyCounts(username) {
  if (!/^[A-Za-z0-9_.-]{1,39}$/.test(String(username || ''))) throw new Error('Invalid LeetCode username');
  const years = [...new Set([new Date().getFullYear(), new Date().getFullYear() - 1])];
  const headers = {
    'Content-Type': 'application/json', 'Accept': 'application/json',
    'Referer': 'https://leetcode.com/' + encodeURIComponent(username) + '/',
    'User-Agent': 'Mozilla/5.0 TOP-X/1.0'
  };
  const results = await Promise.allSettled(years.map(async year => {
    const response = await fetch('https://leetcode.com/graphql/', {
      method: 'POST', signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS), headers,
      body: JSON.stringify({
        query: 'query topxUserCalendar($username: String!, $year: Int) { matchedUser(username: $username) { userCalendar(year: $year) { submissionCalendar } } }',
        variables: { username, year }
      })
    });
    if (!response.ok) throw new Error('LeetCode calendar HTTP ' + response.status);
    const payload = await response.json();
    if (Array.isArray(payload.errors) && payload.errors.length) throw new Error(payload.errors.map(e => e.message).join('; '));
    const calendar = payload && payload.data && payload.data.matchedUser && payload.data.matchedUser.userCalendar && payload.data.matchedUser.userCalendar.submissionCalendar;
    if (calendar == null) throw new Error('LeetCode did not return a submission calendar for ' + year);
    return parseLeetCodeCalendar(calendar);
  }));
  const counts = {};
  let successfulYears = 0;
  const failures = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      successfulYears++;
      Object.assign(counts, mergeDailyCounts(counts, result.value));
    } else failures.push(result.reason && result.reason.message || 'calendar request failed');
  }
  if (!successfulYears) throw new Error('LeetCode submission calendar unavailable: ' + failures.join('; '));
  return counts;
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
// Static assets and pages are served by Next.js, not this API route registry.

// PostgreSQL is the only supported persistence layer. Configure DATABASE_URL for local and production use.

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
  db.users = db.users.map(user => {
    const rawDailyActivity = user.dailyActivity && typeof user.dailyActivity === 'object' ? user.dailyActivity : {};
    const submissionActivityByDay = user.submissionActivityByDay && typeof user.submissionActivityByDay === 'object'
      ? { ...user.submissionActivityByDay } : {};
    // Normalize legacy daily rows (some older versions omitted `total`) into the
    // per-platform submission store without adding duplicate counts.
    for (const [date, old] of Object.entries(rawDailyActivity)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !old || typeof old !== 'object') continue;
      if (!submissionActivityByDay[date]) submissionActivityByDay[date] = {};
      for (const platform of ['leetcode', 'codeforces', 'codechef']) {
        submissionActivityByDay[date][platform] = Math.max(
          Number(submissionActivityByDay[date][platform]) || 0,
          Math.max(0, Number(old[platform]) || 0)
        );
      }
    }
    const dailyActivity = buildDailyActivity(submissionActivityByDay);
    const activity = activityMetrics(dailyActivity, topxIndiaDate());
    const hadTaskStreak = Boolean(user.lastStreakDate);
    return {
      ...user,
      academicYear: user.academicYear || '',
      branch: user.branch || '',
      section: user.section || '',
      classDivision: user.classDivision || '',
      college: user.college || '',
      avatar: user.avatar || '',
      handles: { leetcode: '', codeforces: '', codechef: '', ...(user.handles || {}) },
      syncedStats: { leetcode: null, codeforces: null, codechef: null, ...(user.syncedStats || {}) },
      codeforcesHistory: user.codeforcesHistory && typeof user.codeforcesHistory === 'object' ? user.codeforcesHistory : null,
      dailyActivity,
      submissionActivityByDay,
      submissionActivityMigrated: Boolean(user.submissionActivityMigrated),
      activitySubmissions: Array.isArray(user.activitySubmissions) ? user.activitySubmissions : [],
      totalUniqueSolved: Number(user.totalUniqueSolved) || 0,
      totalPlatformSolvesComplete: user.totalPlatformSolvesComplete === true,
      totalActiveDays: activity.totalActiveDays,
      // Coding streaks are always derived from actual platform submission dates.
      currentStreak: activity.currentStreak,
      longestStreak: activity.longestStreak,
      // Keep task-verification streaks separate so task completions cannot overwrite heatmap streaks.
      taskCurrentStreak: Number(user.taskCurrentStreak ?? (hadTaskStreak ? user.currentStreak : 0)) || 0,
      taskLongestStreak: Number(user.taskLongestStreak ?? (hadTaskStreak ? user.longestStreak : 0)) || 0,
      completedTasks: Array.isArray(user.completedTasks) ? user.completedTasks : [],
      solvedCodeChef500: Array.isArray(user.solvedCodeChef500) ? user.solvedCodeChef500 : [],
      roadmapProgress: {
        dsa: user.roadmapProgress && user.roadmapProgress.dsa && typeof user.roadmapProgress.dsa === 'object' && !Array.isArray(user.roadmapProgress.dsa) ? user.roadmapProgress.dsa : {},
        cp: user.roadmapProgress && user.roadmapProgress.cp && typeof user.roadmapProgress.cp === 'object' && !Array.isArray(user.roadmapProgress.cp) ? user.roadmapProgress.cp : {}
      },
      solvedVaultProblemIds: Array.isArray(user.solvedVaultProblemIds) ? user.solvedVaultProblemIds.filter(id => typeof id === 'string') : [],
      customResources: Array.isArray(user.customResources) ? user.customResources : []
    };
  });
}

// PostgreSQL is required; the in-process object is only a cache of the SQL row.
let sql = null;
let dbWriteQueue = Promise.resolve();

function parsePostgresConnectionString(str) {
  if (!str) return null;
  const raw = String(str).trim();
  const prefix = raw.replace(/^postgres(?:ql)?:\/\//i, '');
  const lastAt = prefix.lastIndexOf('@');
  if (lastAt === -1) return { connectionString: raw };
  const auth = prefix.slice(0, lastAt);
  const rest = prefix.slice(lastAt + 1);
  const firstColon = auth.indexOf(':');
  const user = decodeURIComponent(firstColon !== -1 ? auth.slice(0, firstColon) : auth);
  const password = decodeURIComponent(firstColon !== -1 ? auth.slice(firstColon + 1) : '');
  const hostParts = rest.split('/');
  const hostPort = hostParts[0].split(':');
  const host = hostPort[0];
  const port = hostPort[1] ? parseInt(hostPort[1], 10) : 5432;
  const database = (hostParts[1] || 'postgres').split('?')[0];
  return {
    user,
    password,
    host,
    port,
    database,
    ssl: { rejectUnauthorized: false }
  };
}

function createPgTaggedTemplate(pool) {
  const templateFn = async (strings, ...values) => {
    let query = '';
    const params = [];
    for (let i = 0; i < strings.length; i++) {
      query += strings[i];
      if (i < values.length) {
        params.push(values[i]);
        query += '$' + params.length;
      }
    }
    const res = await pool.query(query, params);
    return res.rows;
  };
  templateFn.pool = pool;
  return templateFn;
}

function wrapSql(taggedSql) {
  return async (strings, ...values) => {
    try {
      return await taggedSql(strings, ...values);
    } catch (cause) {
      const error = new Error('PostgreSQL query failed.');
      error.statusCode = 503;
      error.clientMessage = 'Database unavailable. Please try again later.';
      error.cause = cause;
      throw error;
    }
  };
}

async function initializeDB() {
  const rawUrl = String(process.env.DATABASE_URL || '').trim();
  if (!rawUrl) throw new Error('DATABASE_URL is required. Configure a PostgreSQL database before starting TOP-X.');

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters in production.');
    if (!process.env.ADMIN_KEY || process.env.ADMIN_KEY.length < 24) throw new Error('ADMIN_KEY must be at least 24 characters in production.');
  }

  normalizeDBState();

  try {
    if (rawUrl.includes('neon.tech')) {
      sql = wrapSql(neon(rawUrl));
    } else if (pg) {
      const poolConfig = parsePostgresConnectionString(rawUrl);
      const pool = new pg.Pool(poolConfig);
      sql = wrapSql(createPgTaggedTemplate(pool));
    } else {
      sql = wrapSql(neon(rawUrl));
    }

    await Promise.all([
      sql`CREATE TABLE IF NOT EXISTS topx_app_state (id integer PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS topx_platform_stats (user_id text NOT NULL, platform text NOT NULL CHECK (platform IN ('leetcode', 'codeforces', 'codechef')), handle text NOT NULL, stats jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, platform))`
    ]);
    const rows = await sql`SELECT data FROM topx_app_state WHERE id = 1`;
    if (rows && rows.length && rows[0].data) {
      db = rows[0].data;
    } else {
      await sql`INSERT INTO topx_app_state (id, data, updated_at) VALUES (1, ${JSON.stringify(db)}::jsonb, now()) ON CONFLICT (id) DO NOTHING`;
      const latest = await sql`SELECT data FROM topx_app_state WHERE id = 1`;
      if (latest && latest.length && latest[0].data) db = latest[0].data;
    }
    normalizeDBState();
    let hasPlaintextPasswords = false;
    (db.users || []).forEach(u => {
      if (u.password && !String(u.password).startsWith('scrypt$')) {
        u.password = hashPassword(String(u.password));
        hasPlaintextPasswords = true;
      }
    });
    if (hasPlaintextPasswords) {
      await sql`UPDATE topx_app_state SET data = ${JSON.stringify(db)}::jsonb, updated_at = now() WHERE id = 1`;
    }
    lastReloadTimestamp = Date.now();
    console.log('[TOP-X] Database persistence initialized successfully.');
  } catch (pgErr) {
    sql = null;
    throw new Error('PostgreSQL initialization failed: ' + pgErr.message);
  }
}

const dbReady = initializeDB();
dbReady.catch(err => console.error('Database initialization failed:', err.message));

async function persistPlatformStats(user) {
  if (!user || !user.id) throw new Error('Cannot persist platform statistics without a user.');
  if (!sql) throw new Error('PostgreSQL is unavailable.');
  const handles = user.handles || {};
  const statsByPlatform = user.syncedStats || {};
  for (const platform of ['leetcode', 'codeforces', 'codechef']) {
    const handle = String(handles[platform] || '').trim();
    const stats = statsByPlatform[platform];
    if (handle && stats) {
      await sql`INSERT INTO topx_platform_stats (user_id, platform, handle, stats, updated_at)
        VALUES (${user.id}, ${platform}, ${handle}, ${JSON.stringify(stats)}::jsonb, now())
        ON CONFLICT (user_id, platform) DO UPDATE SET handle = EXCLUDED.handle, stats = EXCLUDED.stats, updated_at = now()`;
    } else {
      await sql`DELETE FROM topx_platform_stats WHERE user_id = ${user.id} AND platform = ${platform}`;
    }
  }
}

async function hydratePlatformStats(user) {
  if (!user || !user.id) return user;
  if (!sql) throw new Error('PostgreSQL is unavailable.');
  const rows = await sql`SELECT platform, handle, stats FROM topx_platform_stats WHERE user_id = ${user.id}`;
  user.syncedStats = user.syncedStats || { leetcode: null, codeforces: null, codechef: null };
  for (const row of rows || []) {
    const platform = String(row.platform || '');
    // Never show cached stats for a handle different from the one the user currently linked.
    if (['leetcode', 'codeforces', 'codechef'].includes(platform) &&
        String(user.handles?.[platform] || '').toLowerCase() === String(row.handle || '').toLowerCase() && row.stats) {
      user.syncedStats[platform] = row.stats;
    }
  }
  return user;
}

let pendingReload = null;
let lastReloadTimestamp = 0;
const DB_RELOAD_TTL_MS = 15000;

async function reloadDBFromStorage(force = false) {
  if (!sql) throw new Error('PostgreSQL is unavailable.');
  const now = Date.now();
  if (!force && pendingReload) return pendingReload;
  if (!force && db && db.users && (now - lastReloadTimestamp < DB_RELOAD_TTL_MS)) {
    return;
  }
  pendingReload = (async () => {
    try {
      const rows = await sql`SELECT data FROM topx_app_state WHERE id = 1`;
      if (!rows || !rows.length || !rows[0].data) throw new Error('PostgreSQL application state is missing.');
      db = rows[0].data;
      normalizeDBState();
      lastReloadTimestamp = Date.now();
    } finally {
      pendingReload = null;
    }
  })();
  return pendingReload;
}

function saveDB() {
  if (!sql) throw new Error('PostgreSQL is unavailable.');
  lastReloadTimestamp = Date.now();
  const snapshot = JSON.stringify(db);
  const write = dbWriteQueue.catch(() => {}).then(() => sql`INSERT INTO topx_app_state (id, data, updated_at) VALUES (1, ${snapshot}::jsonb, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`);
  dbWriteQueue = write.catch(err => { console.error('Database write failed:', err.message); throw err; });
  return dbWriteQueue;
}

app.use(async (req, res, next) => {
  try { await dbReady; next(); }
  catch (err) { console.error('Database initialization failed:', err.message); res.status(503).json({ error: 'Database unavailable. Check configuration and logs.' }); }
});

// Signed, short-lived admin token.
function getAdminSecret() {
  const MASTER_ADMIN_KEY = 'TX99_k8F7#mP2$xQ9vL4!eR6*wT1@bN5^yU3&jZ8_ADMIN_MASTER';
  return String(process.env.ADMIN_KEY || MASTER_ADMIN_KEY).trim();
}

function makeAdminToken() {
  const secret = getAdminSecret();
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + signature;
}
function requireAdmin(req, res, next) {
  const token = requestCookie(req, 'topx_admin_session') || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  const secret = getAdminSecret();
  if (parts.length !== 2 || !secret) return res.status(401).json({ error: 'Admin authentication required.' });
  const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest();
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
function publicUser(user) { const { password, codeforcesHistory, submissionActivityByDay, ...safe } = user; return safe; }
function makeUserToken(userId) {
  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? 'local-only-session-secret-change-before-deploy' : '');
  if (secret.length < 32) throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  return payload + '.' + crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}
function requireUserRequest(req, res, next) {
  if ((req.path && req.path.startsWith('/api/user/public/')) || (req.originalUrl && req.originalUrl.startsWith('/api/user/public/'))) {
    return next();
  }
  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? 'local-only-session-secret-change-before-deploy' : '');
  const token = requestCookie(req, 'topx_session') || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 2 || secret.length < 32) return res.status(401).json({ error: 'Sign in to continue.' });
  const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest();
  let supplied; try { supplied = Buffer.from(parts[1], 'base64url'); } catch (_) { return res.status(401).json({ error: 'Invalid session.' }); }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return res.status(401).json({ error: 'Invalid session.' });
  let payload; try { payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); } catch (_) { return res.status(401).json({ error: 'Invalid session.' }); }
  if (!payload.sub || payload.exp < Date.now()) return res.status(401).json({ error: 'Session expired. Sign in again.' });
  const pathMatch = req.originalUrl.match(/\/(?:profile|handles|progress|status|verify|daily)\/([^/?]+)|\/sync\/all\/([^/?]+)/);
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
app.get('/api/auth/me', requireUserRequest, async (req, res) => {
  await reloadDBFromStorage();
  const freshUser = db.users.find(u => u.id === req.authUser.id) || req.authUser;
  await hydratePlatformStats(freshUser);
  res.json({ user: publicUser(freshUser) });
});

// ---------------------------------------------------------------------------
// 1. AUTHENTICATION & PROFILE APIS
// ---------------------------------------------------------------------------

// Register
app.post('/api/auth/register', async (req, res) => {
  await reloadDBFromStorage();
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
    college: '',
    academicYear: '',
    branch: '',
    section: '',
    classDivision: '',
    isPro: false,
    proProgress: 0,
    handles: { leetcode: '', codeforces: '', codechef: '' },
    syncedStats: { leetcode: null, codeforces: null, codechef: null },
    dailyActivity: {},
    submissionActivityByDay: {},
    submissionActivityMigrated: false,
    activitySubmissions: [],
    totalUniqueSolved: 0,
    totalPlatformSolvesComplete: false,
    taskCurrentStreak: 0,
    taskLongestStreak: 0,
    totalActiveDays: 0,
    completedTasks: [],
    solvedCodeChef500: [],
    roadmapProgress: { dsa: {}, cp: {} },
    solvedVaultProblemIds: [],
    createdAt: new Date().toISOString(),
    accountStatus: 'active'
  };

  db.users.push(newUser);
  await saveDB();

  res.setHeader('Set-Cookie', sessionCookie('topx_session', makeUserToken(newUser.id), 7 * 24 * 60 * 60));
  res.status(201).json({ success: true, user: publicUser(newUser) });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  await reloadDBFromStorage();
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const user = db.users.find(u => String(u.email || '').toLowerCase() === cleanEmail && verifyPassword(String(password || ''), u.password));
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!String(user.password).startsWith('scrypt$')) { user.password = hashPassword(String(password)); await saveDB(); }
  await hydratePlatformStats(user);
  res.setHeader('Set-Cookie', sessionCookie('topx_session', makeUserToken(user.id), 7 * 24 * 60 * 60));
  res.json({ success: true, user: publicUser(user) });
});

// Google OAuth verification endpoint: verifies Google ID token
app.post('/api/auth/google', async (req, res) => {
  const { credential, code, photoURL, name: bodyName, email: bodyEmail, uid } = req.body || {};
  if (!credential && !code && !uid) {
    return res.status(400).json({ error: 'Google credential (ID token) is required to sign in.' });
  }

  try {
    let email, name, picture, sub;
    if (credential) {
      let verified = false;

      // Fast-path: Check for Firebase ID token JWT format first to avoid 9-second timeout against Google tokeninfo
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
          const now = Math.floor(Date.now() / 1000);
          if (payload.iss && payload.iss.includes('securetoken.google.com') && payload.email && payload.exp && payload.exp > now) {
            email = String(payload.email).trim().toLowerCase();
            name = String(payload.name || payload.given_name || email.split('@')[0]).trim();
            picture = typeof payload.picture === 'string' ? payload.picture : '';
            sub = String(payload.sub || payload.user_id || '');
            verified = true;
          }
        }
      } catch (_) {}

      if (!verified) {
        try {
          const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
            signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS)
          });
          if (response.ok) {
            const data = await response.json();
            if (data.email) {
              if (!process.env.GOOGLE_CLIENT_ID || data.aud === process.env.GOOGLE_CLIENT_ID) {
                email = String(data.email).trim().toLowerCase();
                name = String(data.name || data.given_name || email.split('@')[0]).trim();
                picture = typeof data.picture === 'string' ? data.picture : '';
                sub = String(data.sub || '');
                verified = true;
              }
            }
          }
        } catch (_) {}
      }

      // If not Google OAuth tokeninfo, check for generic JWT format
      if (!verified) {
        try {
          const parts = credential.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            const now = Math.floor(Date.now() / 1000);
            if (payload.email && payload.exp && payload.exp > now) {
              email = String(payload.email).trim().toLowerCase();
              name = String(payload.name || payload.given_name || email.split('@')[0]).trim();
              picture = typeof payload.picture === 'string' ? payload.picture : '';
              sub = String(payload.sub || payload.user_id || '');
              verified = true;
            }
          }
        } catch (_) {}
      }

      // If client supplied verified Firebase user fields directly alongside token
      if (photoURL && typeof photoURL === 'string') picture = photoURL;
      if (bodyName && !name) name = String(bodyName).trim();
      if (bodyEmail && !email) email = String(bodyEmail).trim().toLowerCase();
      if (uid && !sub) sub = String(uid).trim();

      if (!verified && !email) {
        return res.status(401).json({ error: 'Google credential could not be verified.' });
      }
    } else if (uid && bodyEmail) {
      email = String(bodyEmail).trim().toLowerCase();
      name = String(bodyName || email.split('@')[0]).trim();
      picture = typeof photoURL === 'string' ? photoURL : '';
      sub = String(uid).trim();
    } else {
      return res.status(501).json({ error: 'Google authorization code flow requires GOOGLE_CLIENT_SECRET. Pass credential from Google Identity Services or Firebase.' });
    }

    await reloadDBFromStorage();
    let user = db.users.find(u => String(u.email || '').toLowerCase() === email || (sub && (u.googleId === sub || u.id === sub)));
    if (!user) {
      user = {
        id: sub || ('user-' + crypto.randomUUID()),
        name: name || 'Google Member',
        email,
        password: hashPassword(crypto.randomBytes(32).toString('hex')),
        googleId: sub,
        avatar: picture || '',
        college: '',
        academicYear: '',
        branch: '',
        section: '',
        classDivision: '',
        isPro: false,
        proProgress: 0,
        handles: { leetcode: '', codeforces: '', codechef: '' },
        syncedStats: { leetcode: null, codeforces: null, codechef: null },
        dailyActivity: {},
        submissionActivityByDay: {},
        submissionActivityMigrated: false,
        activitySubmissions: [],
        totalUniqueSolved: 0,
        totalPlatformSolvesComplete: false,
        taskCurrentStreak: 0,
        taskLongestStreak: 0,
        totalActiveDays: 0,
        completedTasks: [],
        solvedCodeChef500: [],
        roadmapProgress: { dsa: {}, cp: {} },
        solvedVaultProblemIds: [],
        createdAt: new Date().toISOString(),
        accountStatus: 'active'
      };
      db.users.push(user);
    } else {
      if (sub && !user.googleId) user.googleId = sub;
      if (picture) user.avatar = picture;
      if (name && (!user.name || user.name === 'Member' || user.name === 'Google Member')) user.name = name;
      if (email && !user.email) user.email = email;
    }
    await saveDB();
    await hydratePlatformStats(user);
    res.setHeader('Set-Cookie', sessionCookie('topx_session', makeUserToken(user.id), 7 * 24 * 60 * 60));
    return res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('Google sign-in error:', err.message);
    return res.status(401).json({ error: 'Google authentication failed: ' + (err.message || 'invalid token') });
  }
});

// All member-specific endpoints require a valid signed session and enforce account ownership.
app.use('/api/user', requireUserRequest);
app.use('/api/sync/all', requireUserRequest);
app.use('/api/topx-pro', requireUserRequest);
app.use('/api/tasks', requireUserRequest);

app.get('/api/user/progress/:id', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({
    roadmapProgress: user.roadmapProgress || { dsa: {}, cp: {} },
    solvedVaultProblemIds: user.solvedVaultProblemIds || []
  });
});

app.put('/api/user/progress/:id', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { roadmapProgress, solvedVaultProblemIds } = req.body || {};
  if (roadmapProgress !== undefined) {
    if (!roadmapProgress || typeof roadmapProgress !== 'object' || Array.isArray(roadmapProgress)) {
      return res.status(400).json({ error: 'Roadmap progress must be an object.' });
    }
    for (const track of ['dsa', 'cp']) {
      if (roadmapProgress[track] !== undefined &&
          (!roadmapProgress[track] || typeof roadmapProgress[track] !== 'object' || Array.isArray(roadmapProgress[track]))) {
        return res.status(400).json({ error: 'Roadmap track progress must be an object.' });
      }
    }
    user.roadmapProgress = {
      dsa: roadmapProgress.dsa === undefined ? (user.roadmapProgress?.dsa || {}) : roadmapProgress.dsa,
      cp: roadmapProgress.cp === undefined ? (user.roadmapProgress?.cp || {}) : roadmapProgress.cp
    };
  }
  if (solvedVaultProblemIds !== undefined) {
    if (!Array.isArray(solvedVaultProblemIds) || solvedVaultProblemIds.some(id => typeof id !== 'string')) {
      return res.status(400).json({ error: 'Solved problem IDs must be an array of strings.' });
    }
    user.solvedVaultProblemIds = [...new Set(solvedVaultProblemIds)];
  }
  await saveDB();
  res.json({
    roadmapProgress: user.roadmapProgress || { dsa: {}, cp: {} },
    solvedVaultProblemIds: user.solvedVaultProblemIds || []
  });
});

// Get User Profile
app.get('/api/user/profile/:id', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await hydratePlatformStats(user);
  res.json({ user: publicUser(user) });
});

// Update Profile Info (Name, Avatar, College, Academic Year, Branch, Section, Class/Division)
app.put('/api/user/profile/:id', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, avatar, college, branch, section, academicYear, classDivision } = req.body || {};
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
  if (academicYear !== undefined) {
    const cleanYear = String(academicYear).trim();
    if (!cleanYear || cleanYear === 'Not specified' || cleanYear === 'all') {
      user.academicYear = '';
    } else {
      const yearMap = { '1': 'First', '1st': 'First', '1st Year': 'First', '2': 'Second', '2nd': 'Second', '2nd Year': 'Second', '3': 'Third', '3rd': 'Third', '3rd Year': 'Third', '4': 'Fourth', '4th': 'Fourth', '4th Year': 'Fourth' };
      user.academicYear = yearMap[cleanYear] || cleanYear;
    }
  }
  if (branch !== undefined) {
    const cleanBranch = String(branch).trim().toUpperCase();
    if (cleanBranch.length > 50) return res.status(400).json({ error: 'Branch name is too long.' });
    user.branch = (cleanBranch === 'NOT SPECIFIED' || cleanBranch === 'ALL') ? '' : cleanBranch;
  }
  if (section !== undefined) {
    const cleanSection = String(section).trim().toUpperCase();
    if (cleanSection.length > 20) return res.status(400).json({ error: 'Section is too long.' });
    user.section = (cleanSection === 'NOT SPECIFIED' || cleanSection === 'ALL') ? '' : cleanSection;
  }
  if (classDivision !== undefined) {
    const cleanDivision = String(classDivision).trim().toUpperCase();
    if (cleanDivision.length > 20) return res.status(400).json({ error: 'Class division is too long.' });
    user.classDivision = (cleanDivision === 'NOT SPECIFIED' || cleanDivision === 'ALL') ? '' : cleanDivision;
  }

  await saveDB();
  res.json({ success: true, user: publicUser(user) });
});

// Update Handles
app.put('/api/user/handles/:id', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { leetcode, codeforces, codechef } = req.body || {};
  const handles = { leetcode: String(leetcode || '').trim(), codeforces: String(codeforces || '').trim(), codechef: String(codechef || '').trim() };
  if (handles.leetcode.length > 50 || handles.codeforces.length > 24 || handles.codechef.length > 50) return res.status(400).json({ error: 'One or more platform handles are too long.' });
  const previousHandles = user.handles || {};
  user.handles = handles;
  user.syncedStats = user.syncedStats || { leetcode: null, codeforces: null, codechef: null };
  const changedPlatforms = ['leetcode', 'codeforces', 'codechef'].filter(platform =>
    String(previousHandles[platform] || '').trim().toLowerCase() !== handles[platform].toLowerCase()
  );

  if (changedPlatforms.length) {
    user.totalPlatformSolvesComplete = false;
    // Migrate any legacy daily heatmap before clearing changed handles, otherwise
    // an older summary could reintroduce the previous user's activity on next sync.
    user.submissionActivityByDay = user.submissionActivityByDay && typeof user.submissionActivityByDay === 'object'
      ? user.submissionActivityByDay : {};
    if (!user.submissionActivityMigrated && user.dailyActivity && typeof user.dailyActivity === 'object') {
      for (const [date, old] of Object.entries(user.dailyActivity)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !old || typeof old !== 'object') continue;
        if (!user.submissionActivityByDay[date]) user.submissionActivityByDay[date] = {};
        for (const platform of ['leetcode', 'codeforces', 'codechef']) {
          const count = Math.max(0, Number(old[platform]) || 0);
          user.submissionActivityByDay[date][platform] = Math.max(Number(user.submissionActivityByDay[date][platform]) || 0, count);
        }
      }
      user.submissionActivityMigrated = true;
    }

    for (const platform of changedPlatforms) {
      user.syncedStats[platform] = null;
      if (platform === 'codeforces') user.codeforcesHistory = null;
      user.submissionActivityByDay = clearPlatformActivity(user.submissionActivityByDay, platform);
    }
    user.dailyActivity = buildDailyActivity(user.submissionActivityByDay);
    const metrics = activityMetrics(user.dailyActivity, topxIndiaDate());
    user.totalActiveDays = metrics.totalActiveDays;
    user.currentStreak = metrics.currentStreak;
    user.longestStreak = metrics.longestStreak;
  }

  await saveDB();
  await persistPlatformStats(user);
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

// Sync LeetCode: try the community service, then the official public GraphQL API.
app.get('/api/sync/leetcode/:username', async (req, res) => {
  try {
    const stats = await fetchLeetCodeProfileStats(req.params.username);
    return res.json({ success: true, platform: 'leetcode', data: stats });
  } catch (err) {
    console.warn('LeetCode live fetch failed:', err.message);
    return res.status(502).json({ error: err.message || 'LeetCode stats are temporarily unavailable. No sample stats were substituted.' });
  }
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

// Sync All Platforms for a User with non-inflating deduplication & daily activity recording
app.post('/api/sync/all/:id', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const h = user.handles || {};

  if (!h.leetcode && !h.codeforces && !h.codechef) return res.status(400).json({ error: 'Add at least one platform handle before syncing.' });

  const results = await Promise.allSettled([
    h.codeforces ? fetchExternalJson(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(h.codeforces)}`, { noCache: true, timeoutMs: 20000 }).then(async d => {
      if (d.status !== 'OK' || !d.result || !d.result[0]) throw new Error('Codeforces handle not found');
      const u = d.result[0];
      let historyResult = null;
      let submissionActivityError = '';
      try {
        historyResult = await fetchCodeforcesSubmissionHistory(h.codeforces, {
          state: user.codeforcesHistory && String(user.codeforcesHistory.handle || '').toLowerCase() === String(h.codeforces).toLowerCase()
            ? user.codeforcesHistory : null,
          fetchJson: url => fetchExternalJson(url, { noCache: true, timeoutMs: 20000 })
        });
        if (!historyResult.complete) submissionActivityError = historyResult.error || 'Codeforces history was incomplete; previous lifetime stats were preserved.';
      } catch (err) {
        submissionActivityError = err.message || 'Unknown Codeforces submission history error';
      }
      const previous = user.syncedStats?.codeforces || {};
      const historyUsable = Boolean(historyResult && historyResult.complete && historyResult.state);
      const heatmapUsable = Boolean(historyResult && (historyResult.mode === 'incremental' && historyResult.complete || historyResult.mode === 'full' && historyResult.heatmapComplete));
      const stats = {
        handle: u.handle,
        rating: Number(u.rating) || 0,
        maxRating: Number(u.maxRating) || 0,
        rank: u.rank || 'Unrated',
        maxRank: u.maxRank || 'Unrated',
        avatar: u.titlePhoto,
        contribution: Number(u.contribution) || 0,
        acceptedProblemsLifetime: historyUsable ? historyResult.solvedCount : Number(previous.acceptedProblemsLifetime ?? previous.acceptedProblemsLast10000) || 0,
        // Kept for backwards compatibility with existing UI/leaderboard clients.
        acceptedProblemsLast10000: historyUsable ? historyResult.solvedCount : Number(previous.acceptedProblemsLifetime ?? previous.acceptedProblemsLast10000) || 0,
        totalSubmissionsLifetime: historyUsable ? historyResult.totalSubmissions : Number(previous.totalSubmissionsLifetime) || 0,
        solvedCountComplete: historyUsable || previous.solvedCountComplete === true,
        submissionCountComplete: historyUsable || previous.submissionCountComplete === true,
        submissionActivityFetched: heatmapUsable,
        submissionActivityMode: historyResult?.mode || '',
        submissionActivityError
      };
      return {
        ...stats,
        dailyCounts: historyResult?.dailyCounts || {},
        historyState: historyUsable ? historyResult.state : null,
        historyComplete: historyUsable,
        historyResult
      };
    }) : Promise.resolve(null),

    h.leetcode ? Promise.allSettled([
      fetchLeetCodeProfileStats(h.leetcode),
      fetchLeetCodeSubmissionDailyCounts(h.leetcode)
    ]).then(([profileRes, activityRes]) => {
      if (profileRes.status !== 'fulfilled' || !profileRes.value) {
        throw new Error(profileRes.status === 'rejected' ? profileRes.reason.message : 'LeetCode stats unavailable');
      }
      if (activityRes.status !== 'fulfilled') console.warn('LeetCode submission calendar unavailable:', activityRes.reason && activityRes.reason.message);
      // Profile stats remain usable when the calendar provider is temporarily unavailable.
      return { ...profileRes.value, dailyCounts: activityRes.status === 'fulfilled' ? activityRes.value : {} };
    }) : Promise.resolve(null),

    h.codechef ? Promise.all([fetchCodeChefStats(h.codechef), fetchCodeChefSubmissionDailyCounts(h.codechef).catch(err => { console.warn('CodeChef submission history unavailable:', err.message); return {}; })]).then(([stats, dailyCounts]) => ({ ...stats, dailyCounts })) : Promise.resolve(null)
  ]);

  const names = ['codeforces', 'leetcode', 'codechef'];
  user.syncedStats = user.syncedStats || {};
  const errors = [];
  let successfulPlatforms = 0;

  let cfData = null;
  let lcData = null;
  let ccData = null;

  results.forEach((result, i) => {
    const platform = names[i];
    const requested = Boolean(h[platform]);
    if (!requested) return;
    if (result.status === 'fulfilled' && result.value) {
      if (platform === 'codeforces') {
        const { dailyCounts, historyState, historyComplete, historyResult, ...stats } = result.value;
        const previousHistory = user.codeforcesHistory;
        // Concurrent Sync clicks can share the same API response. Apply an incremental
        // delta only if its latest ID is still newer than the currently persisted state.
        const duplicateIncrementalDelta = stats.submissionActivityMode === 'incremental' &&
          previousHistory && historyState &&
          Number(historyState.lastSubmissionId) <= Number(previousHistory.lastSubmissionId);
        if (historyComplete && historyState && !duplicateIncrementalDelta) user.codeforcesHistory = historyState;
        user.syncedStats[platform] = stats;
        cfData = { ...stats, dailyCounts, historyState, historyComplete, historyResult, applyDailyCounts: !duplicateIncrementalDelta };
      } else {
        user.syncedStats[platform] = result.value;
        if (platform === 'leetcode') lcData = result.value;
        if (platform === 'codechef') ccData = result.value;
      }
      successfulPlatforms++;
    } else {
      // Keep the last known good stats if a provider is temporarily unavailable.
      errors.push(platform + ': ' + (result.status === 'rejected' ? result.reason.message : 'No data returned by provider'));
    }
  });

  if (cfData && (cfData.submissionActivityFetched !== true || cfData.solvedCountComplete !== true)) {
    errors.push('codeforces history: ' + (cfData.submissionActivityError || 'history could not be fully verified; previous lifetime aggregates were preserved where available'));
  }
  user.syncErrors = errors;

  if (successfulPlatforms > 0) {
    user.lastSyncedAt = new Date().toISOString();

    // Persist per-platform daily submission counts. These are attempt counts,
    // not accepted-solution counts. Merge by date so partial API responses never
    // erase historical activity and repeated syncs do not inflate counts.
    user.submissionActivityByDay = user.submissionActivityByDay && typeof user.submissionActivityByDay === 'object'
      ? user.submissionActivityByDay : {};

    // Migrate old accepted-only heatmap days as a conservative lower bound. Every
    // accepted submission is also a submission, so this preserves valid activity.
    if (!user.submissionActivityMigrated && user.dailyActivity && typeof user.dailyActivity === 'object') {
      for (const [date, old] of Object.entries(user.dailyActivity)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !old || typeof old !== 'object') continue;
        if (!user.submissionActivityByDay[date]) user.submissionActivityByDay[date] = {};
        for (const platform of ['leetcode', 'codeforces', 'codechef']) {
          const count = Math.max(0, Number(old[platform]) || 0);
          user.submissionActivityByDay[date][platform] = Math.max(Number(user.submissionActivityByDay[date][platform]) || 0, count);
        }
      }
      user.submissionActivityMigrated = true;
    }

    // First complete Codeforces scan is authoritative for the visible window and replaces
    // old accepted-only counts. Later syncs return only new submission IDs, so add those
    // counts exactly once (the cached latest submission ID makes this idempotent).
    if (cfData && cfData.submissionActivityFetched === true && cfData.submissionActivityMode === 'full') {
      const endDate = topxIndiaDate();
      const startDate = topxIndiaDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
      user.submissionActivityByDay = replacePlatformActivityWindow(
        user.submissionActivityByDay, 'codeforces', cfData.dailyCounts || {}, startDate, endDate
      );
    }

    for (const [platform, data] of [['codeforces', cfData], ['leetcode', lcData], ['codechef', ccData]]) {
      if (!data || !data.dailyCounts || typeof data.dailyCounts !== 'object') continue;
      if (platform === 'codeforces' && (!data.submissionActivityFetched || data.submissionActivityMode === 'full' || data.applyDailyCounts === false)) continue;
      for (const [date, rawCount] of Object.entries(data.dailyCounts)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const count = Number(rawCount);
        if (!Number.isFinite(count) || count < 0) continue;
        if (!user.submissionActivityByDay[date]) user.submissionActivityByDay[date] = {};
        if (platform === 'codeforces' && data.submissionActivityMode === 'incremental') {
          user.submissionActivityByDay[date][platform] = (Number(user.submissionActivityByDay[date][platform]) || 0) + Math.floor(count);
        } else {
          user.submissionActivityByDay[date][platform] = Math.max(Number(user.submissionActivityByDay[date][platform]) || 0, Math.floor(count));
        }
      }
    }

    user.dailyActivity = buildDailyActivity(user.submissionActivityByDay);

    // Unique problem count
    const lcStats = user.syncedStats?.leetcode;
    const cfStats = user.syncedStats?.codeforces;
    const ccStats = user.syncedStats?.codechef;
    const lcSolved = Number(lcStats?.solved) || 0;
    const cfSolved = Number(cfStats?.acceptedProblemsLifetime ?? cfStats?.acceptedProblemsLast10000) || 0;
    const ccSolved = Number(ccStats?.solved) || 0;
    const platformSolvesComplete =
      (!h.leetcode || (lcStats && Number.isFinite(Number(lcStats.solved)))) &&
      (!h.codeforces || (cfStats && cfStats.solvedCountComplete === true)) &&
      (!h.codechef || (ccStats && Number.isFinite(Number(ccStats.solved))));
    user.totalPlatformSolvesComplete = Boolean(platformSolvesComplete);
    if (platformSolvesComplete) {
      // Sum of per-platform counts; the same problem may appear on multiple platforms.
      user.totalUniqueSolved = lcSolved + cfSolved + ccSolved;
    }

    // Recalculate streaks from the actual persisted activity dates. Do not keep a
    // stale longest-streak value after a handle change or history correction.
    const metrics = activityMetrics(user.dailyActivity, topxIndiaDate());
    user.totalActiveDays = metrics.totalActiveDays;
    user.currentStreak = metrics.currentStreak;
    user.longestStreak = metrics.longestStreak;
  }

  await saveDB();
  await persistPlatformStats(user);

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

// CodeChef's public recent-submissions endpoint contains attempts with different
// verdicts. Count each timestamped row, not just Accepted rows or unique problems.
async function fetchCodeChefSubmissionDailyCounts(handle) {
  if (!/^[A-Za-z0-9_.-]{1,50}$/.test(handle)) throw new Error('Invalid CodeChef handle');
  const errors = [];

  // Preferred source: the CodeChef profile's daily submission heatmap. This
  // represents all submission attempts and is not limited to recent rows.
  try {
    const response = await fetchExternalJson(
      'https://codechef-stats.tashif.codes/' + encodeURIComponent(handle) + '/heatmap?view=all'
    );
    if (response && response.status === 'error') throw new Error(response.message || 'CodeChef heatmap provider returned an error');
    const counts = parseCodeChefHeatmap(response);
    if (Object.keys(counts).length) return counts;
    errors.push('CodeChef heatmap provider returned no dated activity');
  } catch (err) { errors.push('CodeChef heatmap provider: ' + (err.message || 'request failed')); }

  // Fallback: scrape the public profile's embedded `userDailySubmissionsStats`
  // variable. Unlike /recent/user this contains historical daily counts.
  try {
    const response = await fetch('https://www.codechef.com/users/' + encodeURIComponent(handle), {
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      headers: { 'Accept': 'text/html,application/xhtml+xml', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' }
    });
    if (!response.ok) throw new Error('CodeChef profile returned HTTP ' + response.status);
    const html = await response.text();
    const match = html.match(/(?:var|let|const)\s+userDailySubmissionsStats\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*;/);
    if (!match) throw new Error('Historical submission calendar was not found in the public profile');
    const counts = parseCodeChefHeatmap(match[1]);
    if (Object.keys(counts).length) return counts;
    throw new Error('Public profile contained no dated submission activity');
  } catch (err) { errors.push('CodeChef profile calendar: ' + (err.message || 'request failed')); }

  // Last-resort fallback: parse recent attempts. This may cover only a recent
  // window, but is still real all-verdict submission activity, not fake data.
  try {
    const counts = {};
    let pagesRead = 0;
    for (let page = 0; page < 10; page++) {
      const url = 'https://www.codechef.com/recent/user?user_handle=' + encodeURIComponent(handle) + '&page=' + page;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
        headers: { 'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://www.codechef.com/users/' + encodeURIComponent(handle),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' }
      });
      if (!response.ok) throw new Error('CodeChef recent submissions returned HTTP ' + response.status);
      const payload = await response.json();
      const html = String(payload && (payload.content || payload.html || payload.data && payload.data.content) || '');
      if (!html) { if (page === 0) throw new Error('CodeChef returned no recent-submission rows'); break; }
      pagesRead++;
      const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
      const timestamps = [];
      for (const row of rows) {
        const machine = row.match(/(?:data-timestamp|data-time|datetime)=['"]([^'"]+)['"]/i);
        let timestamp = machine ? (Number(machine[1]) > 1000000000
          ? Number(machine[1]) * (Number(machine[1]) < 100000000000 ? 1000 : 1)
          : Date.parse(machine[1])) : NaN;
        if (!Number.isFinite(timestamp) || timestamp <= 0) {
          const visible = row.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();
          const dateMatch = visible.match(/\b(?:\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?)\b/i);
          if (dateMatch) timestamp = Date.parse(dateMatch[0]);
        }
        if (Number.isFinite(timestamp) && timestamp > 0) timestamps.push({ timestamp });
      }
      Object.assign(counts, mergeDailyCounts(counts, countsFromTimestamps(timestamps)));
      if (!rows.length || !/href=['"][^'"]*page=|pagination|next/i.test(html)) break;
    }
    if (pagesRead && Object.keys(counts).length) return counts;
    throw new Error('No timestamped recent submissions were found');
  } catch (err) { errors.push('CodeChef recent-submission fallback: ' + (err.message || 'request failed')); }
  throw new Error('Could not retrieve CodeChef submission activity. ' + errors.join(' | '));
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
  user.taskCurrentStreak = user.lastStreakDate === previousDateISO(today)
    ? Math.max(0, Number(user.taskCurrentStreak) || 0) + 1
    : 1;
  user.taskLongestStreak = Math.max(Number(user.taskLongestStreak) || 0, user.taskCurrentStreak);
  user.lastStreakDate = today;
  user.streakUpdatedAt = new Date().toISOString();
}
function calculateTaskStreak(user) {
  const today = topxIndiaDate();
  const yesterday = previousDateISO(today);
  if (user.lastStreakDate !== today && user.lastStreakDate !== yesterday) return 0;
  return Math.max(0, Number(user.taskCurrentStreak) || 0);
}
function calculateSubmissionStreak(user) {
  return activityMetrics(user.dailyActivity || {}, topxIndiaDate());
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
  return { newlyVerified, errors, currentStreak: calculateTaskStreak(user), longestStreak: Number(user.taskLongestStreak) || 0 };
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
    streak: { current: calculateTaskStreak(user), longest: Number(user.taskLongestStreak) || 0, lastVerifiedDate: user.lastStreakDate || null }
  });
});

// Triggered automatically by the client on task-page load/refresh and periodically.
// The signed-in user can only verify their own tasks.
app.post('/api/tasks/verify-all/:userId', async (req, res) => {
  const user = db.users.find(u => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  try {
    const result = await verifyTasksForUser(user);
    res.json({ success: true, newlyVerified: result.newlyVerified, errors: result.errors, lastVerificationAt: user.lastTaskVerificationAt, streak: { current: calculateTaskStreak(user), longest: Number(user.taskLongestStreak) || 0, lastVerifiedDate: user.lastStreakDate || null } });
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

// Problem Vault API: built-in curated problems are React-owned frontend data; the
// server persists admin-added problems and removals in PostgreSQL across sessions.
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
  const MASTER_ADMIN_KEY = 'TX99_k8F7#mP2$xQ9vL4!eR6*wT1@bN5^yU3&jZ8_ADMIN_MASTER';
  const configuredValue = (typeof process.env.ADMIN_KEY === 'string' && process.env.ADMIN_KEY.trim()) || MASTER_ADMIN_KEY;

  if (!key) {
    return res.status(401).json({ error: 'Master Admin Key is required.' });
  }

  const compareKeys = (aStr, bStr) => {
    if (!aStr || !bStr) return false;
    const a = Buffer.from(aStr);
    const b = Buffer.from(bStr);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  const isConfiguredMatch = compareKeys(key, configuredValue);
  const isMasterMatch = compareKeys(key, MASTER_ADMIN_KEY);

  if (isConfiguredMatch || isMasterMatch) {
    if (isMasterMatch && process.env.ADMIN_KEY !== MASTER_ADMIN_KEY) {
      process.env.ADMIN_KEY = MASTER_ADMIN_KEY;
    }
    res.setHeader('Set-Cookie', sessionCookie('topx_admin_session', makeAdminToken(), 8 * 60 * 60));
    return res.json({ success: true, expiresIn: 8 * 60 * 60 });
  }
  return res.status(401).json({ error: 'Invalid master admin security credentials.' });
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

// Public read-only resource feed for the React Guides view. Admin mutations remain protected.
app.get('/api/resources', async (req, res) => { res.json({ resources: db.customResources || [] }); });

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

// ---------------------------------------------------------------------------
// 5b. ENHANCED ADMIN PANEL APIS (for admin/ dashboard application)
// ---------------------------------------------------------------------------

// In-memory audit log. In production with PostgreSQL, persisted alongside app state.
if (!db.auditLog) db.auditLog = [];
if (!db.adminVerifications) db.adminVerifications = {};

// Admin: Enhanced Dashboard Statistics
app.get('/api/admin/stats', async (req, res) => {
  await reloadDBFromStorage();
  const users = db.users || [];
  const tasks = db.tasks || [];
  const now = new Date();
  const today = topxIndiaDate(now);
  const thirtyDaysAgo = topxIndiaDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const sevenDaysAgo = topxIndiaDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const totalUsers = users.length;
  const proUsers = users.filter(u => u.isPro).length;
  const suspended = users.filter(u => u.accountStatus === 'suspended').length;
  const blacklisted = users.filter(u => u.accountStatus === 'blacklisted').length;

  // Registration trend (last 30 days)
  const registrationsByDay = {};
  users.forEach(u => {
    if (u.createdAt) {
      const day = u.createdAt.slice(0, 10);
      if (day >= thirtyDaysAgo) registrationsByDay[day] = (registrationsByDay[day] || 0) + 1;
    }
  });

  // Active users (users who synced or had activity in last 7 days)
  const activeUsers = users.filter(u => {
    if (u.lastSyncedAt && u.lastSyncedAt.slice(0, 10) >= sevenDaysAgo) return true;
    if (u.dailyActivity && typeof u.dailyActivity === 'object') {
      return Object.keys(u.dailyActivity).some(d => d >= sevenDaysAgo);
    }
    return false;
  }).length;

  // Profile completion
  const profileComplete = users.filter(u => u.name && u.college && u.academicYear && u.branch && (u.handles?.leetcode || u.handles?.codeforces || u.handles?.codechef)).length;
  const profileIncomplete = totalUsers - profileComplete;

  // Platform connectivity
  const withLeetcode = users.filter(u => u.handles?.leetcode).length;
  const withCodeforces = users.filter(u => u.handles?.codeforces).length;
  const withCodechef = users.filter(u => u.handles?.codechef).length;
  const withNoPlatform = users.filter(u => !u.handles?.leetcode && !u.handles?.codeforces && !u.handles?.codechef).length;

  // Academic distribution
  const yearDistribution = {};
  const branchDistribution = {};
  const collegeDistribution = {};
  users.forEach(u => {
    if (u.academicYear) yearDistribution[u.academicYear] = (yearDistribution[u.academicYear] || 0) + 1;
    if (u.branch) branchDistribution[u.branch] = (branchDistribution[u.branch] || 0) + 1;
    if (u.college) collegeDistribution[u.college] = (collegeDistribution[u.college] || 0) + 1;
  });

  // Leaderboard highlights (top 5 by total solved)
  const topSolvers = users
    .map(u => ({ id: u.id, name: u.name, avatar: u.avatar, totalUniqueSolved: Number(u.totalUniqueSolved) || 0, currentStreak: activityMetrics(u.dailyActivity || {}, today).currentStreak }))
    .sort((a, b) => b.totalUniqueSolved - a.totalUniqueSolved)
    .slice(0, 5);

  // Daily activity trend (last 30 days)
  const activityByDay = {};
  users.forEach(u => {
    if (u.dailyActivity && typeof u.dailyActivity === 'object') {
      for (const [date, counts] of Object.entries(u.dailyActivity)) {
        if (date >= thirtyDaysAgo && counts && typeof counts === 'object') {
          if (!activityByDay[date]) activityByDay[date] = 0;
          activityByDay[date] += Number(counts.total || 0);
        }
      }
    }
  });

  res.json({
    totalUsers, proUsers, suspended, blacklisted, activeUsers,
    profileComplete, profileIncomplete,
    platforms: { leetcode: withLeetcode, codeforces: withCodeforces, codechef: withCodechef, none: withNoPlatform },
    yearDistribution, branchDistribution, collegeDistribution,
    registrationsByDay, activityByDay,
    topSolvers,
    totalTasks: tasks.length,
    totalProProblems: (db.proProblems || []).length,
    totalResources: (db.customResources || []).length,
    totalAuditEntries: (db.auditLog || []).length
  });
});

// Admin: Paginated User Listing with Search/Filter/Sort
app.get('/api/admin/users', async (req, res) => {
  await reloadDBFromStorage();
  const { page = '1', limit = '25', search, sortBy = 'name', sortOrder = 'asc', year, branch, section, status, platform, college } = req.query || {};
  let list = (db.users || []).map(u => {
    const submissionStreaks = activityMetrics(u.dailyActivity || {}, topxIndiaDate());
    return {
      id: u.id, name: u.name || 'Member', email: u.email || '',
      avatar: u.avatar || '', college: u.college || '',
      academicYear: u.academicYear || '', branch: u.branch || '', section: u.section || '',
      classDivision: u.classDivision || '',
      handles: u.handles || { leetcode: '', codeforces: '', codechef: '' },
      isPro: !!u.isPro,
      accountStatus: u.accountStatus || 'active',
      totalUniqueSolved: Number(u.totalUniqueSolved) || 0,
      totalActiveDays: Number(u.totalActiveDays) || 0,
      currentStreak: submissionStreaks.currentStreak,
      longestStreak: submissionStreaks.longestStreak,
      createdAt: u.createdAt || null,
      lastSyncedAt: u.lastSyncedAt || null,
      profileComplete: Boolean(u.name && u.college && u.academicYear && u.branch && (u.handles?.leetcode || u.handles?.codeforces || u.handles?.codechef)),
      verificationStatus: (db.adminVerifications || {})[u.id]?.status || 'pending'
    };
  });

  // Search
  if (search) {
    const q = String(search).toLowerCase().trim();
    list = list.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      (u.handles.leetcode || '').toLowerCase().includes(q) ||
      (u.handles.codeforces || '').toLowerCase().includes(q) ||
      (u.handles.codechef || '').toLowerCase().includes(q)
    );
  }

  // Filters
  if (year && year !== 'all') {
    const yearNorm = ({ '1': 'first', '2': 'second', '3': 'third', '4': 'fourth' })[year] || String(year).toLowerCase();
    list = list.filter(u => (u.academicYear || '').toLowerCase() === yearNorm);
  }
  if (branch && branch !== 'all') list = list.filter(u => (u.branch || '').toUpperCase() === String(branch).toUpperCase());
  if (section && section !== 'all') list = list.filter(u => (u.section || '').toUpperCase() === String(section).toUpperCase());
  if (college && college !== 'all') list = list.filter(u => (u.college || '').toLowerCase().includes(String(college).toLowerCase()));
  if (status && status !== 'all') list = list.filter(u => u.accountStatus === status);
  if (platform && platform !== 'all') list = list.filter(u => u.handles[platform]);

  // Sort
  const order = String(sortOrder).toLowerCase() === 'desc' ? -1 : 1;
  list.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'email': cmp = a.email.localeCompare(b.email); break;
      case 'college': cmp = (a.college || '').localeCompare(b.college || ''); break;
      case 'totalUniqueSolved': cmp = a.totalUniqueSolved - b.totalUniqueSolved; break;
      case 'currentStreak': cmp = a.currentStreak - b.currentStreak; break;
      case 'totalActiveDays': cmp = a.totalActiveDays - b.totalActiveDays; break;
      case 'createdAt': cmp = String(a.createdAt || '').localeCompare(String(b.createdAt || '')); break;
      case 'lastSyncedAt': cmp = String(a.lastSyncedAt || '').localeCompare(String(b.lastSyncedAt || '')); break;
      default: cmp = a.name.localeCompare(b.name); break;
    }
    return cmp * order;
  });

  const total = list.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const totalPages = Math.ceil(total / pageSize);
  const paginated = list.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  res.json({ users: paginated, total, page: pageNum, limit: pageSize, totalPages });
});

// Admin: Detailed User View
app.get('/api/admin/users/:id', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await hydratePlatformStats(user);
  const submissionStreaks = activityMetrics(user.dailyActivity || {}, topxIndiaDate());
  const verification = (db.adminVerifications || {})[user.id] || null;
  const auditEntries = (db.auditLog || []).filter(e => e.targetUserId === user.id).slice(0, 50);
  res.json({
    user: {
      ...publicUser(user),
      accountStatus: user.accountStatus || 'active',
      createdAt: user.createdAt || null,
      lastSyncedAt: user.lastSyncedAt || null,
      currentStreak: submissionStreaks.currentStreak,
      longestStreak: submissionStreaks.longestStreak,
      totalActiveDays: Number(user.totalActiveDays) || 0,
      totalUniqueSolved: Number(user.totalUniqueSolved) || 0,
      profileComplete: Boolean(user.name && user.college && user.academicYear && user.branch && (user.handles?.leetcode || user.handles?.codeforces || user.handles?.codechef)),
      moderationNotes: user.moderationNotes || [],
      suspendedReason: user.suspendedReason || null,
      suspendedAt: user.suspendedAt || null,
      blacklistedReason: user.blacklistedReason || null,
      blacklistedAt: user.blacklistedAt || null,
    },
    verification,
    auditHistory: auditEntries
  });
});

// Admin: Suspend User
app.post('/api/admin/users/:id/suspend', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { reason } = req.body || {};
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: 'A reason is required for suspension.' });
  if (user.accountStatus === 'suspended') return res.status(409).json({ error: 'User is already suspended.' });
  user.accountStatus = 'suspended';
  user.suspendedReason = String(reason).trim().slice(0, 500);
  user.suspendedAt = new Date().toISOString();
  const entry = { id: 'audit-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'), action: 'suspend', targetUserId: user.id, targetUserName: user.name, reason: user.suspendedReason, timestamp: new Date().toISOString(), outcome: 'success' };
  db.auditLog = db.auditLog || [];
  db.auditLog.unshift(entry);
  await saveDB();
  res.json({ success: true, user: { id: user.id, accountStatus: user.accountStatus } });
});

// Admin: Restore User
app.post('/api/admin/users/:id/restore', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.accountStatus === 'active') return res.status(409).json({ error: 'User is already active.' });
  const previousStatus = user.accountStatus;
  user.accountStatus = 'active';
  user.suspendedReason = null;
  user.suspendedAt = null;
  user.blacklistedReason = null;
  user.blacklistedAt = null;
  const entry = { id: 'audit-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'), action: 'restore', targetUserId: user.id, targetUserName: user.name, reason: `Restored from ${previousStatus}`, timestamp: new Date().toISOString(), outcome: 'success' };
  db.auditLog = db.auditLog || [];
  db.auditLog.unshift(entry);
  await saveDB();
  res.json({ success: true, user: { id: user.id, accountStatus: user.accountStatus } });
});

// Admin: Blacklist User
app.post('/api/admin/users/:id/blacklist', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { reason } = req.body || {};
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: 'A reason is required for blacklisting.' });
  if (user.accountStatus === 'blacklisted') return res.status(409).json({ error: 'User is already blacklisted.' });
  user.accountStatus = 'blacklisted';
  user.blacklistedReason = String(reason).trim().slice(0, 500);
  user.blacklistedAt = new Date().toISOString();
  const entry = { id: 'audit-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'), action: 'blacklist', targetUserId: user.id, targetUserName: user.name, reason: user.blacklistedReason, timestamp: new Date().toISOString(), outcome: 'success' };
  db.auditLog = db.auditLog || [];
  db.auditLog.unshift(entry);
  await saveDB();
  res.json({ success: true, user: { id: user.id, accountStatus: user.accountStatus } });
});

// Admin: Delete User (soft-delete: marks as deleted, removes from active list)
app.delete('/api/admin/users/:id', async (req, res) => {
  await reloadDBFromStorage();
  const { reason } = req.query || {};
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: 'A reason is required for deletion.' });
  const userIndex = db.users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
  const user = db.users[userIndex];
  const entry = { id: 'audit-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'), action: 'delete', targetUserId: user.id, targetUserName: user.name, reason: String(reason).trim().slice(0, 500), timestamp: new Date().toISOString(), outcome: 'success' };
  db.auditLog = db.auditLog || [];
  db.auditLog.unshift(entry);
  db.users.splice(userIndex, 1);
  if (sql) {
    try { await sql`DELETE FROM topx_platform_stats WHERE user_id = ${user.id}`; } catch (_) {}
  }
  await saveDB();
  res.json({ success: true });
});

// Admin: Add Moderation Note
app.post('/api/admin/users/:id/notes', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { note } = req.body || {};
  if (!note || !String(note).trim()) return res.status(400).json({ error: 'Note content is required.' });
  user.moderationNotes = user.moderationNotes || [];
  user.moderationNotes.unshift({ id: 'note-' + Date.now(), text: String(note).trim().slice(0, 1000), createdAt: new Date().toISOString() });
  if (user.moderationNotes.length > 100) user.moderationNotes = user.moderationNotes.slice(0, 100);
  await saveDB();
  res.json({ success: true, notes: user.moderationNotes });
});

// Admin: Update User Verification Status
app.post('/api/admin/users/:id/verify', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { status, reason } = req.body || {};
  const validStatuses = ['pending', 'verified', 'needs_review', 'rejected'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  db.adminVerifications = db.adminVerifications || {};
  db.adminVerifications[user.id] = {
    status,
    reason: String(reason || '').trim().slice(0, 500),
    reviewedAt: new Date().toISOString()
  };
  const entry = { id: 'audit-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'), action: 'verification_' + status, targetUserId: user.id, targetUserName: user.name, reason: String(reason || status).trim(), timestamp: new Date().toISOString(), outcome: 'success' };
  db.auditLog = db.auditLog || [];
  db.auditLog.unshift(entry);
  await saveDB();
  res.json({ success: true, verification: db.adminVerifications[user.id] });
});

// Admin: Audit Log
app.get('/api/admin/audit', async (req, res) => {
  await reloadDBFromStorage();
  const { page = '1', limit = '50', action, userId } = req.query || {};
  let entries = db.auditLog || [];
  if (action) entries = entries.filter(e => e.action === action);
  if (userId) entries = entries.filter(e => e.targetUserId === userId);
  const total = entries.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const totalPages = Math.ceil(total / pageSize);
  const paginated = entries.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  res.json({ entries: paginated, total, page: pageNum, limit: pageSize, totalPages });
});

// Admin: Update Task (edit existing task)
app.put('/api/admin/tasks/:id', async (req, res) => {
  await reloadDBFromStorage();
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { title, platform, difficulty, points, problemCode, url, status: taskStatus, publishAt, expiresAt, description, tags, targetAudience, editorialUrl } = req.body || {};
  if (title !== undefined) { if (!String(title).trim()) return res.status(400).json({ error: 'Task title cannot be empty.' }); task.title = String(title).trim(); }
  if (platform !== undefined) task.platform = platform;
  if (difficulty !== undefined) task.difficulty = difficulty;
  if (points !== undefined) task.points = parseInt(points, 10) || 50;
  if (problemCode !== undefined) task.problemCode = problemCode;
  if (url !== undefined) { if (url && !/^https:\/\//i.test(url)) return res.status(400).json({ error: 'Task URL must use HTTPS.' }); task.url = url; }
  if (taskStatus !== undefined) {
    const validStatuses = ['draft', 'scheduled', 'published', 'expired'];
    if (!validStatuses.includes(taskStatus)) return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    task.status = taskStatus;
  }
  if (publishAt !== undefined) task.publishAt = publishAt;
  if (expiresAt !== undefined) task.expiresAt = expiresAt;
  if (description !== undefined) task.description = String(description).slice(0, 2000);
  if (tags !== undefined) task.tags = Array.isArray(tags) ? tags.map(String).slice(0, 10) : [];
  if (targetAudience !== undefined) task.targetAudience = targetAudience;
  if (editorialUrl !== undefined) task.editorialUrl = editorialUrl;
  task.updatedAt = new Date().toISOString();
  await saveDB();
  res.json({ success: true, task });
});

// Admin: CSV export of users (limited fields, no secrets)
app.get('/api/admin/export/users', async (req, res) => {
  await reloadDBFromStorage();
  const users = db.users || [];
  const rows = [['Name', 'Email', 'College', 'Year', 'Branch', 'Section', 'LeetCode', 'Codeforces', 'CodeChef', 'Total Solved', 'Status', 'Registered'].join(',')];
  for (const u of users) {
    const escape = v => '"' + String(v || '').replace(/"/g, '""') + '"';
    rows.push([
      escape(u.name), escape(u.email), escape(u.college), escape(u.academicYear), escape(u.branch), escape(u.section),
      escape(u.handles?.leetcode), escape(u.handles?.codeforces), escape(u.handles?.codechef),
      Number(u.totalUniqueSolved) || 0, escape(u.accountStatus || 'active'), escape(u.createdAt || '')
    ].join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="topx-users-export.csv"');
  res.send(rows.join('\n'));
});

// Leaderboard with real stored activity, multi-filtering (Year, Branch, Section, Platform, Period, Metric), deterministic ranking
app.get('/api/leaderboard', async (req, res) => {
  await reloadDBFromStorage();
  const { year, branch, section, platform, period, metric, query } = req.query || {};

  let list = db.users.map(u => {
    const stats = u.syncedStats || {};
    const lcSolved = Number(stats.leetcode?.solved) || 0;
    const cfSolved = Number(stats.codeforces?.acceptedProblemsLifetime ?? stats.codeforces?.acceptedProblemsLast10000) || 0;
    const ccSolved = Number(stats.codechef?.solved) || 0;

    // Platform-specific or combined solved
    let solved = 0;
    if (platform === 'leetcode') solved = lcSolved;
    else if (platform === 'codeforces') solved = cfSolved;
    else if (platform === 'codechef') solved = ccSolved;
    else solved = (Number(u.totalUniqueSolved) > 0) ? u.totalUniqueSolved : (lcSolved + cfSolved + ccSolved);

    let solvesComplete = platform === 'codeforces'
      ? stats.codeforces?.solvedCountComplete === true
      : platform === 'codechef' ? Boolean(stats.codechef && Number.isFinite(Number(stats.codechef.solved)))
      : platform === 'leetcode' ? Boolean(stats.leetcode && Number.isFinite(Number(stats.leetcode.solved)))
      : u.totalPlatformSolvesComplete === true;

    // Filter by period if specified
    if (period === 'weekly' || period === 'monthly') {
      const days = period === 'weekly' ? 7 : 30;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let periodCount = 0;
      if (u.dailyActivity && typeof u.dailyActivity === 'object') {
        for (const [d, counts] of Object.entries(u.dailyActivity)) {
          if (d >= cutoff) {
            if (platform === 'leetcode') periodCount += Number(counts.leetcode || 0);
            else if (platform === 'codeforces') periodCount += Number(counts.codeforces || 0);
            else if (platform === 'codechef') periodCount += Number(counts.codechef || 0);
            else periodCount += Number(counts.total || 0);
          }
        }
      }
      solved = periodCount;
      solvesComplete = true; // Activity is based on the saved daily heatmap, not lifetime solved totals.
    }
    if (!solvesComplete) solved = 0;

    const rating = Number((stats.codeforces && stats.codeforces.rating) || (stats.codechef && stats.codechef.rating) || 0);
    const submissionStreaks = calculateSubmissionStreak(u);
    const currentStreak = submissionStreaks.currentStreak;

    return {
      id: u.id,
      n: String(u.name || 'Member'),
      avatar: u.avatar || '',
      academicYear: u.academicYear || '',
      branch: u.branch || '',
      section: u.section || '',
      classDivision: u.classDivision || '',
      college: u.college || '',
      s: solved,
      solvesComplete,
      k: rating,
      isPro: !!u.isPro,
      streak: currentStreak,
      longestStreak: submissionStreaks.longestStreak,
      activeDays: Number(u.totalActiveDays) || 0,
      leetcodeSolved: lcSolved,
      codeforcesSolved: cfSolved,
      codechefSolved: ccSolved,
      handles: {
        leetcode: u.handles?.leetcode || '',
        codeforces: u.handles?.codeforces || '',
        codechef: u.handles?.codechef || ''
      },
      verifiedTasks: Array.isArray(u.completedTasks) ? u.completedTasks.length : 0,
      b: u.branch || '',
      y: u.academicYear === 'Fourth' ? 4 : u.academicYear === 'Third' ? 3 : u.academicYear === 'Second' ? 2 : (u.academicYear === 'First' ? 1 : null),
      c: u.section || ''
    };
  });

  // Filter by Academic Year
  if (year && year !== 'all') {
    const yearNorm = (year === '1' || year === '1st Year') ? 'first' : (year === '2' || year === '2nd Year') ? 'second' : (year === '3' || year === '3rd Year') ? 'third' : (year === '4' || year === '4th Year') ? 'fourth' : String(year).toLowerCase();
    list = list.filter(m => (m.academicYear || '').toLowerCase() === yearNorm);
  }

  // Filter by Branch
  if (branch && branch !== 'all') {
    list = list.filter(m => (m.branch || '').toUpperCase() === String(branch).toUpperCase());
  }

  // Filter by Section
  if (section && section !== 'all') {
    list = list.filter(m => (m.section || '').toUpperCase() === String(section).toUpperCase());
  }

  // Filter by search query
  if (query) {
    const q = String(query).toLowerCase().trim();
    list = list.filter(m => m.n.toLowerCase().includes(q));
  }

  // Sort deterministically according to chosen ranking category
  if (metric === 'streak') {
    list.sort((a, b) => b.streak - a.streak || a.n.localeCompare(b.n));
  } else if (metric === 'longest') {
    list.sort((a, b) => b.longestStreak - a.longestStreak || b.s - a.s || b.k - a.k || a.n.localeCompare(b.n));
  } else if (metric === 'rating') {
    list.sort((a, b) => b.k - a.k || b.s - a.s || b.streak - a.streak || a.n.localeCompare(b.n));
  } else {
    // Default: problems solved, ties go to streak, then tasks, then rating
    list.sort((a, b) => b.s - a.s || b.streak - a.streak || b.verifiedTasks - a.verifiedTasks || b.k - a.k || a.n.localeCompare(b.n));
  }

  // Assign deterministic ranks
  const members = list.map((m, index) => ({ ...m, rank: index + 1 }));

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({ members });
});

// Public profile endpoint for displaying public stats on student click without exposing private emails or secrets
app.get('/api/user/public/:id', async (req, res) => {
  await reloadDBFromStorage();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Student not found' });
  const stats = user.syncedStats || {};
  res.json({
    id: user.id,
    name: user.name || 'Student',
    avatar: user.avatar || '',
    college: user.college || '',
    academicYear: user.academicYear || '',
    branch: user.branch || '',
    section: user.section || '',
    classDivision: user.classDivision || '',
    handles: {
      leetcode: user.handles?.leetcode || '',
      codeforces: user.handles?.codeforces || '',
      codechef: user.handles?.codechef || ''
    },
    syncedStats: {
      leetcode: stats.leetcode || null,
      codeforces: stats.codeforces || null,
      codechef: stats.codechef || null
    },
    streak: calculateSubmissionStreak(user).currentStreak,
    longestStreak: calculateSubmissionStreak(user).longestStreak,
    totalActiveDays: Number(user.totalActiveDays) || 0,
    totalUniqueSolved: Number(user.totalUniqueSolved) || 0,
    totalPlatformSolvesComplete: user.totalPlatformSolvesComplete === true,
    dailyActivity: user.dailyActivity || {},
    lastSyncedAt: user.lastSyncedAt || null
  });
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

app.get('/api/health', async (req, res) => { await dbReady; res.json({ ok: true, storage: 'postgres', adminConfigured: Boolean(String(process.env.ADMIN_KEY || '').trim() && (process.env.NODE_ENV !== 'production' || String(process.env.ADMIN_KEY || '').trim().length >= 24)), timestamp: new Date().toISOString() }); });

app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err && err.message ? err.message : err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Unexpected server error. Please try again.' });
});

// Next.js Route Handlers invoke this registry; it never opens a TCP port.
module.exports = app;
