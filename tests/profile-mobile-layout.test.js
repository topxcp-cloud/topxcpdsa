const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('profile phone layout keeps stats, streaks, rewards, and filters compact and usable', () => {
  const styles = read('components/profile/profile.css');
  const profile = read('components/legacy-src/components/views/ProfileView.jsx');
  const phoneStyles = styles.slice(styles.lastIndexOf('@media (max-width: 480px)'));

  assert.match(phoneStyles, /\.profile-filter-pills\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(phoneStyles, /\.profile-stats-grid-row\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(phoneStyles, /\.profile-stat-box\.primary-total[\s\S]*?grid-column:\s*1 \/ -1/);
  assert.match(phoneStyles, /\.profile-streak-metrics-strip\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(phoneStyles, /\.streak-reward-grid\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(profile, /id="connected-coding-platforms"/);
  assert.match(profile, /onClick=\{handleSyncAll\}/);
});
