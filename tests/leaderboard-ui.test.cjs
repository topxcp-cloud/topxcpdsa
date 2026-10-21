const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('leaderboard score bars scale against the highest visible solved count', async () => {
  const { maxSolvedCount } = await import('../components/leaderboard/own/data.js');
  const source = fs.readFileSync(
    path.join(__dirname, '../components/leaderboard/own/OwnLeaderboard.jsx'),
    'utf8'
  );

  assert.equal(maxSolvedCount([{ s: 4 }, { s: 18 }, { s: 9 }]), 18);
  assert.equal(maxSolvedCount([{ s: 0 }, { s: null }]), 1);
  assert.match(source, /maxSolvedCount\(list\)/);
});

test('leaderboard identity keys distinguish students with duplicate names', async () => {
  const { studentKey } = await import('../components/leaderboard/own/data.js');
  const source = fs.readFileSync(
    path.join(__dirname, '../components/leaderboard/own/LeaderTable.jsx'),
    'utf8'
  );

  assert.notEqual(
    studentKey({ id: 'student-1', n: 'Alex Lee' }),
    studentKey({ id: 'student-2', n: 'Alex Lee' })
  );
  assert.match(source, /studentKey\(d\)/);
});
