'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { preserveSolvedCount } = require('../lib/api/platform-stat-preservation.cjs');

test('preserves last known solved count when provider omits the count', () => {
  const result = preserveSolvedCount(
    { solved: 123, solvedCountComplete: true },
    { handle: 'member', solved: 0, solvedCountComplete: false }
  );
  assert.deepEqual(result, { handle: 'member', solved: 123, solvedCountComplete: true });
});

test('does not mark a missing count complete when there is no saved count', () => {
  const result = preserveSolvedCount(
    {},
    { handle: 'member', solved: 0, solvedCountComplete: false }
  );
  assert.deepEqual(result, { handle: 'member', solved: 0, solvedCountComplete: false });
});

test('uses a fresh complete count instead of the previous count', () => {
  const result = preserveSolvedCount(
    { solved: 123, solvedCountComplete: true },
    { handle: 'member', solved: 0, solvedCountComplete: true }
  );
  assert.deepEqual(result, { handle: 'member', solved: 0, solvedCountComplete: true });
});

test('preserves legacy saved counts without a completeness marker', () => {
  const result = preserveSolvedCount(
    { solved: 42 },
    { handle: 'member', solved: 0, solvedCountComplete: false }
  );
  assert.deepEqual(result, { handle: 'member', solved: 42, solvedCountComplete: true });
});
