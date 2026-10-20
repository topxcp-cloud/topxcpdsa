'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../lib/api/cron-sync-policy.cjs');

test('invalid batch settings safely fall back and valid settings are bounded', () => {
  assert.equal(policy.parseBoundedInt('bad', 10, 1, 10), 10);
  assert.equal(policy.parseBoundedInt('100', 10, 1, 10), 10);
  assert.equal(policy.parseBoundedInt('0', 10, 1, 10), 1);
  assert.equal(policy.parseBoundedInt('4', 10, 1, 10), 4);
});

test('failed users are deferred until their retry time', () => {
  const now = Date.parse('2026-10-20T04:00:00Z');
  assert.equal(policy.isRetryDue({ nextRetryAt: new Date(now + 60_000).toISOString() }, now), false);
  assert.equal(policy.isRetryDue({ nextRetryAt: new Date(now - 1).toISOString() }, now), true);
  assert.equal(policy.isRetryDue({}, now), true);
});

test('retry backoff grows exponentially and is capped at eight hours', () => {
  assert.equal(policy.retryDelayMs(1), 5 * 60 * 1000);
  assert.equal(policy.retryDelayMs(2), 10 * 60 * 1000);
  assert.equal(policy.retryDelayMs(3), 20 * 60 * 1000);
  assert.equal(policy.retryDelayMs(20), 8 * 60 * 60 * 1000);
});

test('queue skips deferred failures and prioritizes stalest healthy users', () => {
  const now = Date.now();
  const users = [
    { id: 'bad', lastSyncedAt: null, cronSync: { nextRetryAt: new Date(now + 60_000).toISOString() } },
    { id: 'newer', lastSyncedAt: new Date(now - 1000).toISOString() },
    { id: 'oldest', lastSyncedAt: new Date(now - 100_000).toISOString() }
  ];
  assert.deepEqual(policy.selectDueUsers(users, now).map(user => user.id), ['oldest', 'newer']);
});

test('budget guard leaves room for one slow provider sync', () => {
  const start = 1000;
  assert.equal(policy.canStartNextUser(start, 38_000, start + 15_000), true);
  assert.equal(policy.canStartNextUser(start, 38_000, start + 16_001), false);
});

test('remaining count only includes due users not attempted in this batch', () => {
  const users = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(policy.remainingDueCount(users, new Set(['a', 'c'])), 1);
  assert.equal(policy.remainingDueCount(users, new Set(['a', 'b', 'c'])), 0);
});
