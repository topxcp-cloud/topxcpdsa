const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const activity = require('../lib/api/submission-activity.cjs');

test('LeetCode calendar parser counts all submission activity per date', () => {
  const calendar = JSON.stringify({
    [Math.floor(Date.parse('2026-10-10T18:30:00Z') / 1000)]: 4,
    [Math.floor(Date.parse('2026-10-11T18:30:00Z') / 1000)]: 2
  });
  const counts = activity.parseLeetCodeCalendar(calendar);
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 6);
  assert.equal(Object.keys(counts).length, 2);
});

test('Codeforces-style attempts count regardless of verdict', () => {
  const counts = activity.countsFromTimestamps([
    { timestamp: Date.parse('2026-10-10T10:00:00Z'), verdict: 'OK' },
    { timestamp: Date.parse('2026-10-10T10:05:00Z'), verdict: 'WRONG_ANSWER' },
    { timestamp: Date.parse('2026-10-10T10:10:00Z'), verdict: 'TIME_LIMIT_EXCEEDED' }
  ]);
  assert.equal(Object.values(counts)[0], 3);
});

test('daily counts merge idempotently and do not double-count repeated syncs', () => {
  const once = activity.mergeDailyCounts({ '2026-10-10': 3 }, { '2026-10-10': 5, '2026-10-11': 2 });
  const twice = activity.mergeDailyCounts(once, { '2026-10-10': 5, '2026-10-11': 2 });
  assert.deepEqual(twice, { '2026-10-10': 5, '2026-10-11': 2 });
});

test('unified heatmap combines all three platform submission counts', () => {
  const daily = activity.buildDailyActivity({
    '2026-10-10': { leetcode: 4, codeforces: 3, codechef: 2 },
    '2026-10-11': { leetcode: 0, codeforces: 1, codechef: 0 }
  });
  assert.deepEqual(daily['2026-10-10'], { leetcode: 4, codeforces: 3, codechef: 2, total: 9 });
  assert.deepEqual(daily['2026-10-11'], { leetcode: 0, codeforces: 1, codechef: 0, total: 1 });
});

test('heatmap UI and backend use submission activity, not accepted-only records', () => {
  const ui = fs.readFileSync(path.join(root, 'components/profile/ContributionHeatmap.jsx'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(ui, /Submission Activity Heatmap/);
  assert.match(ui, /All submissions count, including rejected attempts/);
  assert.match(api, /fetchLeetCodeSubmissionDailyCounts/);
  assert.match(api, /fetchCodeChefSubmissionDailyCounts/);
  assert.match(api, /user\.dailyActivity = buildDailyActivity\(user\.submissionActivityByDay\)/);
  assert.match(api, /fetchCodeforcesSubmissionHistory\(h\.codeforces/);
  assert.match(api, /First complete Codeforces scan is authoritative for the visible window/);
  assert.match(api, /acceptedProblemsLifetime/);
  assert.match(api, /CODEFORCES_MIN_REQUEST_INTERVAL_MS = 2100/);
});

test('profile and dashboard expose all-platform and individual platform selectors', () => {
  const profile = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/ProfileView.jsx'), 'utf8');
  const dashboard = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/DashboardView.jsx'), 'utf8');
  for (const source of [profile, dashboard]) {
    assert.match(source, /All platforms|all', 'All platforms/);
    assert.match(source, /Codeforces/);
    assert.match(source, /CodeChef/);
    assert.match(source, /LeetCode/);
  }
});

test('CodeChef heatmap parser supports historical date-count maps and unpadded dates', () => {
  const counts = activity.parseCodeChefHeatmap({
    status: 'success',
    data: { userDailySubmissionsStats: { '2025-8-6': 3, '2025-08-07': 2 } }
  });
  assert.deepEqual(counts, { '2025-08-06': 3, '2025-08-07': 2 });
});

test('CodeChef heatmap parser supports date/count arrays and rejects empty values', () => {
  const counts = activity.parseCodeChefHeatmap({ data: [
    { date: '2026-10-10', value: 4 },
    { date: '2026-10-11', count: 2 },
    { date: 'not-a-date', count: 9 },
    { date: '2026-10-12', count: 0 }
  ] });
  assert.deepEqual(counts, { '2026-10-10': 4, '2026-10-11': 2 });
});

test('profile form stops bubbling so the shell does not send a competing partial save', () => {
  const profile = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/ProfileView.jsx'), 'utf8');
  assert.match(profile, /const handleSaveProfile = async \(e\) => \{\s*if \(e\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); \}/);
});

test('profile save updates the shared session after a successful save', () => {
  const profile = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/ProfileView.jsx'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'components/legacy-src/AppShell.jsx'), 'utf8');
  assert.match(profile, /topx:profile-updated', \{ detail: \{ user: updated \} \}/);
  assert.match(shell, /auth\.setUser\(updatedUser\)/);
});

test('CodeChef activity fetch prefers full historical heatmap endpoint before recent rows', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(api, /\/heatmap\?view=all/);
  assert.match(api, /userDailySubmissionsStats/);
});

test('changing a platform handle clears only that platform historical activity', () => {
  const previous = {
    '2026-10-10': { leetcode: 8, codeforces: 3, codechef: 2 },
    '2026-10-11': { leetcode: 4, codeforces: 0, codechef: 0 },
    '2026-10-12': { leetcode: 0, codeforces: 5, codechef: 0 }
  };
  const afterLeetCodeHandleChange = activity.clearPlatformActivity(previous, 'leetcode');
  assert.deepEqual(afterLeetCodeHandleChange, {
    '2026-10-10': { codeforces: 3, codechef: 2 },
    '2026-10-12': { codeforces: 5, codechef: 0 }
  });
  const daily = activity.buildDailyActivity(afterLeetCodeHandleChange);
  assert.equal(daily['2026-10-10'].total, 5);
  assert.equal(daily['2026-10-11'], undefined);
  assert.equal(daily['2026-10-12'].total, 5);
});

test('activity metrics are recalculated after a platform handle changes', () => {
  const daily = activity.buildDailyActivity({
    '2026-10-10': { codeforces: 1 },
    '2026-10-11': { codeforces: 2 },
    '2026-10-12': { leetcode: 9 }
  });
  assert.deepEqual(activity.activityMetrics(daily, '2026-10-13'), {
    totalActiveDays: 3,
    currentStreak: 3,
    longestStreak: 3
  });
});

test('current streak is the union of activity dates across all coding platforms', () => {
  const metrics = activity.activityMetrics({
    '2026-10-10': { leetcode: 1 },
    '2026-10-11': { codeforces: 1 },
    '2026-10-12': { leetcode: 1, codeforces: 1, codechef: 1 },
    '2026-10-13': { codechef: 1 }
  }, '2026-10-13');
  assert.deepEqual(metrics, {
    totalActiveDays: 4,
    currentStreak: 4,
    longestStreak: 4
  });
});

test('leaderboard ranks solely by current streak and the header displays current streak', () => {
  const leaderboard = fs.readFileSync(path.join(root, 'components/leaderboard/own/data.js'), 'utf8');
  const header = fs.readFileSync(path.join(root, 'components/legacy-src/components/shell/AppHeader.jsx'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(leaderboard, /\(Number\(b\.currentStreak\)\s*\|\|\s*0\)\s*-\s*\(Number\(a\.currentStreak\)\s*\|\|\s*0\)/);
  assert.doesNotMatch(leaderboard, /Number\(b\.p\?\.\[period\]\)/);
  assert.match(api, /list\.sort\(\(a, b\) => b\.streak - a\.streak \|\| a\.n\.localeCompare\(b\.n\)\)/);
  assert.match(header, /const streakCount = Number\(user\?\.currentStreak\) \|\| 0/);
});

test('handle update invalidates stale platform stats and heatmap history', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(api, /const changedPlatforms = \['leetcode', 'codeforces', 'codechef'\]/);
  assert.match(api, /user\.submissionActivityByDay = clearPlatformActivity\(user\.submissionActivityByDay, platform\)/);
  assert.match(api, /user\.syncedStats\[platform\] = null/);
  assert.match(api, /if \(platform === 'codeforces'\) user\.codeforcesHistory = null/);
  assert.match(api, /user\.dailyActivity = buildDailyActivity\(user\.submissionActivityByDay\)/);
});


test('dashboard and profile do not present incomplete Codeforces lifetime solves as verified numbers', () => {
  const profile = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/ProfileView.jsx'), 'utf8');
  const dashboard = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/DashboardView.jsx'), 'utf8');
  for (const source of [profile, dashboard]) {
    assert.match(source, /solvedCountComplete === true/);
    assert.match(source, /: '—'/);
    assert.match(source, /acceptedProblemsLifetime/);
  }
});


test('combined platform solves are marked incomplete until every linked platform count is verified', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(api, /totalPlatformSolvesComplete/);
  assert.match(api, /cfStats && cfStats\.solvedCountComplete === true/);
  assert.match(api, /if \(!solvesComplete\) solved = 0/);
});


test('Codeforces sync protects against duplicate concurrent incremental deltas', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(api, /duplicateIncrementalDelta/);
  assert.match(api, /data\.applyDailyCounts === false/);
  assert.match(api, /submissionCountComplete: historyUsable \|\| previous\.submissionCountComplete === true/);
});


test('Codeforces profile exposes a separately verified lifetime submission count', () => {
  const profile = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/ProfileView.jsx'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(profile, /submissionCountComplete === true/);
  assert.match(profile, /totalSubmissionsLifetime/);
  assert.match(api, /totalSubmissionsLifetime: historyUsable \? historyResult\.totalSubmissions/);
});


test('public user payload omits internal Codeforces lifetime-key cache', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(api, /function publicUser\(user\) \{ const \{ password, codeforcesHistory, submissionActivityByDay, \.\.\.safe \} = user/);
  assert.match(api, /totalPlatformSolvesComplete: user\.totalPlatformSolvesComplete === true/);
});


test('coding streaks derive from submission dates and remain separate from task-verification streaks', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');
  assert.match(api, /function calculateSubmissionStreak\(user\)/);
  assert.match(api, /function calculateTaskStreak\(user\)/);
  assert.match(api, /user\.taskCurrentStreak = user\.lastStreakDate/);
  assert.match(api, /const submissionStreaks = calculateSubmissionStreak\(u\)/);
  assert.match(api, /streak: calculateSubmissionStreak\(user\)\.currentStreak/);
});
