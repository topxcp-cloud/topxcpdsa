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

test('leaderboard gets a compact phone layout while preserving its podium, filters, and table', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '../components/leaderboard/own/own-leaderboard.css'),
    'utf8'
  );

  assert.match(styles, /@media \(max-width: 700px\) \{[\s\S]*?\.own-leaderboard \.pod\s*\{[\s\S]*?repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styles, /\.own-leaderboard \.lb-filter-chips\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(styles, /\.own-leaderboard tbody tr\s*\{[^}]*grid-template-columns:\s*30px minmax\(0,\s*1fr\) auto/s);
  assert.match(styles, /\.own-leaderboard \.pgw\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(styles, /@media \(max-width: 700px\) \{[\s\S]*?\.own-leaderboard \.mebar\s*\{[\s\S]*?max-width:\s*calc\(100% - 32px\)/);
  assert.match(styles, /@media \(max-width: 700px\) \{[\s\S]*?\.own-leaderboard \.pc \.st\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(styles, /\.own-leaderboard \.pc \.rank-suffix\s*\{[^}]*white-space:\s*normal/s);
  assert.match(styles, /@media \(max-width: 700px\) \{[\s\S]*?\.own-leaderboard td:nth-child\(2\) \.mt\s*\{[^}]*margin-left:\s*0/);
  assert.match(styles, /@media \(max-width: 700px\) \{[\s\S]*?\.own-leaderboard \.sv i\s*\{[^}]*width:\s*56px;[^}]*height:\s*8px/s);
});
