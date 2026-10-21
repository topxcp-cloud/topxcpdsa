const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('compact home layout is phone-only and preserves the code typing animation', () => {
  const styles = read('app/globals.css');
  const footerStyles = read('components/legacy-src/components/shell/AppFooter.module.css');
  const home = read('components/home/HomePageView.jsx');
  const compactStyles = styles.slice(styles.lastIndexOf('@media (max-width: 700px)'));

  assert.match(compactStyles, /\.home-page-app \.tx-hero-headline/);
  assert.match(compactStyles, /\.home-page-app \.tx-hero-stats-strip\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(compactStyles, /\.home-page-app \.tx-community-grid\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(compactStyles, /\.home-page-app \.tx-roadmap-timeline\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(compactStyles, /\.home-page-app \.tx-milestone-card\s*\{[^}]*flex:\s*0 0 56%[^}]*padding:\s*12px !important/s);
  assert.match(compactStyles, /\.home-page-app \.tx-milestone-desc\s*\{[^}]*-webkit-line-clamp:\s*3/s);
  assert.match(compactStyles, /\.home-page-app \.home-podium-grid\s*\{[^}]*display:\s*flex/s);
  assert.doesNotMatch(compactStyles, /tx-topx|typingState|charCount|animation/i);
  assert.match(footerStyles, /@media \(max-width: 700px\)[\s\S]*:global\(\.home-page-app\) \.grid/);
  assert.match(home, /fullText\.slice\(0,\s*charCount\)/);
  assert.match(home, /typingState !== 'switching'/);
});
