'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getWeeklyTaskCompletions } = require('../lib/api/weekly-task-progress.cjs');

test('weekly task completions include only verified known tasks within the seven-day window', () => {
  const now = Date.parse('2026-10-19T00:00:00Z');
  const windowStart = now - 7 * 24 * 60 * 60 * 1000;
  const tasks = new Map([
    ['recent', { id: 'recent', title: 'Recent question' }],
    ['old', { id: 'old', title: 'Old question' }],
    ['unverified', { id: 'unverified', title: 'Unverified question' }]
  ]);
  const user = {
    verifiedTasks: {
      recent: { verified: true, verifiedAt: new Date(windowStart + 1000).toISOString() },
      old: { verified: true, verifiedAt: new Date(windowStart - 1000).toISOString() },
      unverified: { verified: false, verifiedAt: new Date(now).toISOString() },
      unknown: { verified: true, verifiedAt: new Date(now).toISOString() },
      future: { verified: true, verifiedAt: new Date(now + 1000).toISOString() }
    }
  };
  assert.deepEqual(getWeeklyTaskCompletions(user, tasks, windowStart, now), [
    { id: 'recent', title: 'Recent question' }
  ]);
});

test('user CSV includes weekly question count and task names', () => {
  const registry = fs.readFileSync(path.join(__dirname, '..', 'lib', 'api', 'route-registry.cjs'), 'utf8');
  assert.match(registry, /'Weekly Questions Solved', 'Weekly Tasks Completed'/);
  assert.match(registry, /weeklyCompletions\.length/);
  assert.match(registry, /weeklyCompletions\.map\(task => task\.title \|\| 'Untitled task'\)\.join\('; '\)/);
  assert.match(registry, /getWeeklyTaskCompletions\(u, tasksById, windowStart, now\)/);
});

test('weekly report and CSV can restrict results to Pro members', () => {
  const registry = fs.readFileSync(path.join(__dirname, '..', 'lib', 'api', 'route-registry.cjs'), 'utf8');
  const api = fs.readFileSync(path.join(__dirname, '..', 'admin', 'src', 'services', 'api.ts'), 'utf8');
  const taskPage = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app', 'tasks', 'page.tsx'), 'utf8');
  assert.match(registry, /const proOnly = \['1', 'true', 'yes'\]\.includes\(String\(req\.query\?\.proOnly/);
  assert.match(registry, /filters: proOnly \? \{ isPro: true \} : \{\}/);
  assert.match(registry, /'Pro Member'/);
  assert.match(api, /getTaskProgress = \(params: Record<string, string> = \{\}\)/);
  assert.match(api, /exportUsersCSV = \(proOnly = false\)/);
  assert.match(taskPage, /Pro members only/);
  assert.match(taskPage, /getTaskProgress\(checked \? \{ proOnly: 'true' \} : \{\}\)/);
});

test('manual task verification returns refreshed statuses for immediate UI updates', () => {
  const registry = fs.readFileSync(path.join(__dirname, '..', 'lib', 'api', 'route-registry.cjs'), 'utf8');
  const tasksView = fs.readFileSync(path.join(__dirname, '..', 'components', 'legacy-src', 'components', 'views', 'TasksView.jsx'), 'utf8');
  assert.match(registry, /const tasks = \(await getCollection\('tasks'\) \|\| \[\]\)\.map\(task => \{/);
  assert.match(registry, /verifiedCount,\s+totalTasks: tasks\.length,\s+tasks,/);
  assert.match(tasksView, /setTasks\(Array\.isArray\(checked\?\.tasks\) \? checked\.tasks : \[\]\)/);
  assert.match(tasksView, /questions verified as solved/);
  assert.match(tasksView, /Some platform submissions could not be checked/);
});
