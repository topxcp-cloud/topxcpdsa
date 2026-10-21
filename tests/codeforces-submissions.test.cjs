'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchCodeforcesSubmissionHistory } = require('../lib/api/codeforces-submissions.cjs');
const { countsFromTimestamps } = require('../lib/api/submission-activity.cjs');

const now = Date.parse('2026-10-14T12:00:00Z');
const recent = seconds => Math.floor((now - seconds * 1000) / 1000);
const row = (id, seconds, verdict, contestId = 100, index = 'A') => ({
  id, creationTimeSeconds: recent(seconds), verdict,
  problem: { contestId, index }
});

 test('first Codeforces sync scans all pages and counts all verdicts plus unique accepted problems', async () => {
  const calls = [];
  const pages = [
    { status: 'OK', result: [row(10, 100, 'OK', 100, 'A'), row(9, 200, 'WRONG_ANSWER', 100, 'A')] },
    { status: 'OK', result: [row(8, 300, 'TIME_LIMIT_EXCEEDED', 101, 'B'), row(7, 400, 'OK', 101, 'B')] },
    { status: 'OK', result: [row(6, 500, 'COMPILATION_ERROR', 102, 'C')] }
  ];
  const history = await fetchCodeforcesSubmissionHistory('sampleHandle', {
    fetchJson: async url => { calls.push(url); return pages[calls.length - 1]; },
    pageSize: 2, maxPages: 5, delayMs: 0, now
  });
  assert.equal(calls.length, 3);
  assert.match(calls[0], /from=1&count=2/);
  assert.match(calls[1], /from=3&count=2/);
  assert.equal(history.complete, true);
  assert.equal(history.mode, 'full');
  assert.equal(history.totalSubmissions, 5);
  assert.equal(history.solvedCount, 2);
  assert.equal(Object.values(history.dailyCounts).reduce((sum, count) => sum + count, 0), 5);
  assert.equal(history.state.lastSubmissionId, 10);
  assert.deepEqual(history.state.acceptedProblemKeys, ['100-A', '101-B']);
});

test('first sync scans older history for lifetime solves but only returns the visible heatmap window', async () => {
  const oldTimestamp = Math.floor((now - 500 * 24 * 60 * 60 * 1000) / 1000);
  const pages = [
    { status: 'OK', result: [row(10, 100, 'OK', 100, 'A'), { ...row(9, 200, 'OK', 100, 'B'), creationTimeSeconds: oldTimestamp }] },
    { status: 'OK', result: [{ ...row(8, 300, 'WRONG_ANSWER', 101, 'C'), creationTimeSeconds: oldTimestamp }] }
  ];
  let call = 0;
  const history = await fetchCodeforcesSubmissionHistory('sampleHandle', {
    fetchJson: async () => pages[call++], pageSize: 2, maxPages: 5, delayMs: 0, now
  });
  assert.equal(history.complete, true);
  assert.equal(history.totalSubmissions, 3);
  assert.equal(history.solvedCount, 2);
  assert.equal(Object.values(history.dailyCounts).reduce((sum, count) => sum + count, 0), 1);
});

test('incremental sync adds only new IDs and is safe across repeated syncs', async () => {
  const state = {
    initialized: true, handle: 'sampleHandle', lastSubmissionId: 10,
    totalSubmissions: 50, acceptedProblemKeys: ['100-A'], updatedAt: '2026-10-13T00:00:00.000Z'
  };
  const pages = [
    { status: 'OK', result: [row(12, 100, 'WRONG_ANSWER', 101, 'B'), row(11, 200, 'OK', 101, 'B')] },
    { status: 'OK', result: [row(10, 300, 'OK', 100, 'A'), row(9, 400, 'OK', 99, 'Z')] }
  ];
  let call = 0;
  const history = await fetchCodeforcesSubmissionHistory('sampleHandle', {
    state, fetchJson: async () => pages[call++], pageSize: 2, maxPages: 5, delayMs: 0, now
  });
  assert.equal(history.complete, true);
  assert.equal(history.mode, 'incremental');
  assert.equal(history.totalSubmissions, 52);
  assert.equal(history.solvedCount, 2);
  assert.equal(Object.values(history.dailyCounts).reduce((sum, count) => sum + count, 0), 2);
  assert.equal(history.state.lastSubmissionId, 12);
});

test('incremental sync preserves previous aggregates if pagination cannot reach the known boundary', async () => {
  const state = { initialized: true, handle: 'sampleHandle', lastSubmissionId: 1, totalSubmissions: 50, acceptedProblemKeys: ['100-A'] };
  const history = await fetchCodeforcesSubmissionHistory('sampleHandle', {
    state,
    fetchJson: async () => ({ status: 'OK', result: [row(20, 100, 'OK'), row(19, 200, 'WRONG_ANSWER')] }),
    pageSize: 2, maxPages: 1, delayMs: 0, now
  });
  assert.equal(history.complete, false);
  assert.equal(history.state, state);
  assert.deepEqual(history.dailyCounts, {});
  assert.equal(history.totalSubmissions, 50);
  assert.match(history.error, /safety limit/);
});

test('Codeforces API errors fail clearly rather than returning fake activity', async () => {
  await assert.rejects(() => fetchCodeforcesSubmissionHistory('sampleHandle', {
    fetchJson: async () => ({ status: 'FAILED', comment: 'limit exceeded' }), delayMs: 0, now
  }), /limit exceeded/);
});

test('invalid submission rows do not create misleading complete aggregates', async () => {
  const history = await fetchCodeforcesSubmissionHistory('sampleHandle', {
    fetchJson: async () => ({ status: 'OK', result: [{ verdict: 'OK', problem: { contestId: 1, index: 'A' } }] }),
    pageSize: 2, maxPages: 5, delayMs: 0, now
  });
  assert.equal(history.complete, false);
  assert.equal(history.state, null);
  assert.match(history.error, /without a valid ID/);
});
