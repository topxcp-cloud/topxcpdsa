'use strict';

const RETRY_BASE_MS = 5 * 60 * 1000;
const RETRY_MAX_MS = 8 * 60 * 60 * 1000;
const PER_USER_RESERVE_MS = 22 * 1000;

function parseBoundedInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function retryDelayMs(attempts) {
  const exponent = Math.max(0, Math.min(10, Number(attempts || 1) - 1));
  return Math.min(RETRY_MAX_MS, RETRY_BASE_MS * (2 ** exponent));
}

function isRetryDue(cronSync, now = Date.now()) {
  const next = cronSync && cronSync.nextRetryAt ? Date.parse(cronSync.nextRetryAt) : 0;
  return !Number.isFinite(next) || next <= now;
}

function selectDueUsers(users, now = Date.now()) {
  return (Array.isArray(users) ? users : [])
    .filter(user => isRetryDue(user.cronSync, now))
    .sort((a, b) => {
      const lastA = Date.parse(a.lastSyncedAt || '') || 0;
      const lastB = Date.parse(b.lastSyncedAt || '') || 0;
      if (lastA !== lastB) return lastA - lastB;
      const attemptA = Date.parse(a.cronSync && a.cronSync.lastAttemptAt || '') || 0;
      const attemptB = Date.parse(b.cronSync && b.cronSync.lastAttemptAt || '') || 0;
      return attemptA - attemptB;
    });
}

function canStartNextUser(startedAt, timeBudgetMs, now = Date.now()) {
  return now - startedAt < Math.max(0, timeBudgetMs - PER_USER_RESERVE_MS);
}

function remainingDueCount(dueUsers, attemptedIds) {
  const attempted = attemptedIds instanceof Set ? attemptedIds : new Set(attemptedIds || []);
  return (Array.isArray(dueUsers) ? dueUsers : []).reduce((count, user) => count + (attempted.has(user.id) ? 0 : 1), 0);
}

module.exports = { RETRY_BASE_MS, RETRY_MAX_MS, PER_USER_RESERVE_MS, parseBoundedInt, retryDelayMs, isRetryDue, selectDueUsers, canStartNextUser, remainingDueCount };
