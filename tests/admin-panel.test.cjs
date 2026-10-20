'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('admin weekly tasks page shows verified counts by question and member', () => {
  const api = read('lib/api/route-registry.cjs');
  const page = read('admin/app/tasks/page.tsx');
  assert.match(api, /app\.get\('\/api\/admin\/tasks\/progress'/);
  assert.match(api, /getWeeklyTaskCompletions\(user, tasksById, windowStart, now\)/);
  assert.match(read('lib/api/weekly-task-progress.cjs'), /verification\.verified !== true/);
  assert.match(read('lib/api/weekly-task-progress.cjs'), /verifiedAt < windowStart/);
  assert.match(api, /taskCount\.completedCount\+\+/);
  assert.match(api, /memberCounts\.push\(\{ id: user\.id, name: user\.name \|\| 'Member', completedCount \}\)/);
  assert.match(page, /Questions Completed This Week/);
  assert.match(page, /Members Who Participated/);
  assert.match(page, /Completions by Question/);
  assert.match(page, /Questions Completed by Member/);
});

test('admin moderation status blocks logins and existing member sessions', () => {
  const api = read('lib/api/route-registry.cjs');
  assert.match(api, /async function requireUserRequest/);
  assert.match(api, /if \(user\.accountStatus === 'suspended'\)[\s\S]*?403/);
  assert.match(api, /if \(user\.accountStatus === 'blacklisted'\)[\s\S]*?403/);
  assert.match(api, /if \(user\.accountStatus === 'suspended' \|\| user\.accountStatus === 'blacklisted'\)[\s\S]*?403/);
  assert.match(api, /if \(user\.accountStatus === 'suspended' \|\| user\.accountStatus === 'blacklisted'\) \{\s*return res\.status\(403\)\.json\(\{ error: 'This account is restricted\./);
  assert.match(api, /listUsers\(\{[\s\S]*?fields: \['name', 'email', 'avatar', 'college', 'academicYear', 'branch', 'section', 'classDivision', 'handles', 'isPro', 'accountStatus'/);
  assert.match(api, /Only active accounts can be suspended/);
  assert.match(api, /app\.post\('\/api\/admin\/users\/:id\/blacklist'/);
});

test('admin panel uses a fixed light theme and hides leaderboard navigation', () => {
  const layout = read('admin/app/layout.tsx');
  const header = read('admin/src/components/Header.tsx');
  const sidebar = read('admin/src/components/Sidebar.tsx');
  const dashboard = read('admin/app/dashboard/page.tsx');
  const leaderboardRoute = read('admin/app/leaderboard/page.tsx');
  const css = read('admin/src/styles/admin.css');
  assert.match(layout, /data-theme="light"/);
  assert.doesNotMatch(header, /theme-toggle|prefers-color-scheme|setAttribute\('data-theme'/);
  assert.doesNotMatch(sidebar, /label: 'Leaderboard'|href: '\/leaderboard'/);
  assert.doesNotMatch(dashboard, /Leaderboard Solvers|\/leaderboard/);
  assert.match(leaderboardRoute, /redirect\('\/dashboard'\)/);
  assert.match(css, /--bg-base:\s*#F7F7F5/);
  assert.match(css, /--accent:\s*#FF5A36/);
});

test('event registration has a public form and admin event configuration and CSV export', () => {
  const api = read('lib/api/route-registry.cjs');
  const publicPage = read('components/events/EventRegistration.tsx');
  const adminPage = read('admin/app/events/page.tsx');
  const sidebar = read('admin/src/components/Sidebar.tsx');

  assert.match(api, /app\.use\('\/api\/admin',[\s\S]*?requireAdmin/);
  assert.match(api, /app\.get\('\/api\/events'/);
  assert.match(api, /app\.post\('\/api\/events\/:id\/register'/);
  assert.match(api, /app\.get\('\/api\/admin\/events\/:id\/export'/);
  assert.match(api, /columns\.map\(column => column\.label\)/);
  assert.match(api, /Object\.keys\(registration\.values \|\| \{\}\)/);
  assert.match(api, /registration\.createdAt/);
  assert.doesNotMatch(api, /\/api\/admin\/events\/:id\/import/);
  assert.match(api, /exactly one email field for registration and duplicate detection/);
  assert.match(api, /ON CONFLICT DO NOTHING RETURNING id/);
  assert.match(publicPage, /Submit registration/);
  assert.match(publicPage, /event\.imageUrl/);
  assert.match(publicPage, /event\.imageData/);
  assert.match(publicPage, /event\.eventUrl/);
  assert.match(publicPage, /event\.eventLinkType === 'linkedin'/);
  assert.match(adminPage, /Registration fields/);
  assert.match(adminPage, /event image URL/);
  assert.match(adminPage, /Upload event image/);
  assert.match(adminPage, /Event information URL/);
  assert.match(adminPage, /LinkedIn profile/);
  assert.match(adminPage, /Custom name/);
  assert.match(adminPage, /Export CSV/);
  assert.doesNotMatch(adminPage, /Import CSV/);
  assert.match(adminPage, /Search registration details/);
  assert.match(sidebar, /href: '\/events'/);
  assert.match(api, /imageUrl: imageUrl\.value/);
  assert.match(api, /imageData/);
  assert.match(api, /imageBytes\.length > 600 \* 1024/);
  assert.match(api, /eventUrl: eventUrl\.value/);
  assert.match(api, /eventLinkType/);
  assert.match(api, /eventLinkLabel/);
  assert.match(api, /url\.protocol/);
});

test('streak rewards can be claimed once at verified milestones and reviewed in admin', () => {
  const api = read('lib/api/route-registry.cjs');
  const profile = read('components/legacy-src/components/views/ProfileView.jsx');
  const adminPage = read('admin/app/streak-rewards/page.tsx');
  const sidebar = read('admin/src/components/Sidebar.tsx');

  assert.match(api, /const STREAK_REWARD_MILESTONES = \[30, 50, 75, 100\]/);
  assert.match(api, /app\.use\('\/api\/streak-rewards', requireUserRequest\)/);
  assert.match(api, /app\.post\('\/api\/streak-rewards\/claim'/);
  assert.match(api, /currentStreak < milestone/);
  assert.match(api, /SELECT 1 FROM topx_streak_reward_claims WHERE user_id = \$\{user\.id\} AND milestone = \$\{milestone\}/);
  assert.match(api, /topx_streak_reward_user_milestone_uidx/);
  assert.match(api, /app\.get\('\/api\/admin\/streak-rewards'/);
  assert.match(profile, /daysToGo = Math\.max\(0, milestone - currentStreak\)/);
  assert.match(profile, /const achieved = currentStreak >= milestone/);
  assert.doesNotMatch(profile, /achievedStreak/);
  assert.match(profile, /Claim reward/);
  assert.match(profile, /Your name is recorded\. You will receive your reward soon\./);
  assert.match(profile, /streak-reward-confetti/);
  assert.match(adminPage, /Branch \/ year \/ section/);
  assert.match(adminPage, /Claimed at/);
  assert.match(sidebar, /href: '\/streak-rewards'/);
});
