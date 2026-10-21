const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('weekly tasks use compact phone-only layout without changing task behavior', () => {
  const styles = read('components/tasks/tasks.css');
  const view = read('components/legacy-src/components/views/TasksView.jsx');
  const compactStyles = styles.slice(styles.lastIndexOf('@media (max-width: 700px)'));

  assert.match(compactStyles, /\.tasks-page-container\s*\{[^}]*padding:\s*18px 16px 26px/s);
  assert.match(compactStyles, /\.tasks-metrics-grid\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(compactStyles, /\.task-row\s*\{[^}]*grid-template-columns:\s*24px minmax\(0,\s*1fr\) auto/s);
  assert.match(compactStyles, /\.task-title\s*\{[^}]*-webkit-line-clamp:\s*2/s);
  assert.match(compactStyles, /\.tasks-secondary-grid\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(compactStyles, /\.tasks-info-card\s*\{[^}]*scroll-snap-align:\s*start/s);
  assert.match(compactStyles, /\.btn-task-solve\s*\{[^}]*min-height:\s*40px/s);
  assert.match(view, /onClick=\{\(\) => load\(true\)\}/);
  assert.match(view, /onClick=\{\(\) => navigateTo\('\/profile'\)\}/);
  assert.match(view, /onClick=\{\(\) => navigateTo\('\/leaderboard'\)\}/);
});
