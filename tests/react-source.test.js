const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'components', 'legacy-src');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
const sources = walk(root).filter(f => /\.(jsx|js)$/.test(f));
test('React source tree includes independently owned feature views and shared data', () => {
  assert.ok(sources.length >= 15, `Expected React source files, found ${sources.length}`);
  for (const name of ['BlueprintsView.jsx', 'RoadmapsView.jsx', 'GuidesView.jsx', 'ProView.jsx']) assert.ok(fs.existsSync(path.join(root, 'components', 'views', name)), `${name} is missing`);
  assert.ok(fs.existsSync(path.join(root, 'features', 'content', 'contentData.js')));
});
test('remaining feature views render declaratively rather than mutating legacy DOM nodes', () => {
  for (const name of ['BlueprintsView.jsx', 'RoadmapsView.jsx', 'GuidesView.jsx', 'ProView.jsx']) {
    const source = fs.readFileSync(path.join(root, 'components', 'views', name), 'utf8');
    assert.match(source, /useState|useEffect|useMemo|useCallback/);
    assert.doesNotMatch(source, /document\.getElementById|innerHTML\s*=/, `${name} should render declaratively in React`);
  }
});
test('blueprint, roadmap and guide content is exported as React-importable data', () => {
  const data = fs.readFileSync(path.join(root, 'features', 'content', 'contentData.js'), 'utf8');
  for (const name of ['BLUEPRINTS_DATA', 'ROADMAP_DSA_PHASES', 'ROADMAP_CP_TIERS', 'GUIDES_DATA']) assert.match(data, new RegExp(`export const ${name}\\s*=`));
});
test('active app uses light theme by default without a theme toggle', () => {
  const layout = fs.readFileSync(path.join(__dirname, '..', 'app', 'layout.tsx'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'AppShell.jsx'), 'utf8');
  const header = fs.readFileSync(path.join(root, 'components', 'shell', 'AppHeader.jsx'), 'utf8');
  assert.match(layout, /data-theme="light"/);
  assert.doesNotMatch(layout, /prefers-color-scheme/);
  assert.doesNotMatch(shell, /theme-toggle-btn|prefers-color-scheme/);
  assert.doesNotMatch(header, /theme-toggle-btn|toggleTheme|isDarkMode/);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'public', 'legacy')), false);
});
test('home spotlight video lazy-loads near the viewport and respects manual pause', () => {
  const home = fs.readFileSync(path.join(__dirname, '..', 'components', 'home', 'HomePageView.jsx'), 'utf8');
  assert.match(home, /<video[\s\S]*?\bmuted\b/);
  assert.doesNotMatch(home, /\bdefaultMuted\b/);
  assert.match(home, /preload="none"/);
  assert.match(home, /src=\{videoLoaded \? '\/topx-intro\.mp4' : undefined\}/);
  assert.match(home, /rootMargin:\s*'240px'/);
  assert.match(home, /if \(!isIntersecting\) video\.pause\(\)/);
  assert.match(home, /userPausedVideoRef\.current/);
  assert.match(home, /if \(!\('IntersectionObserver' in window\)\)/);
  assert.match(home, /isVideoMuted \? 'Unmute video' : 'Mute video'/);
  assert.match(home, /isVideoPlaying \? 'Pause video' : 'Play video'/);
});
