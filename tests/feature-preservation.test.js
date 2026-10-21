const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('removed legacy apps and visualizer assets are absent', () => {
  for (const file of [
    'public/legacy',
    'legacy-reference',
    'public/js/three.min.js',
    'public/js/visualizers.js',
    'public/team.html',
    'scratch/inspect.ps1',
    'components/legacy-src/runtime/useFeatureRuntime.js',
    'components/legacy-src/components/views/LabView.jsx'
  ]) assert.equal(exists(file), false, `${file} should be removed`);
});

test('dashboard and leaderboard remain without visualizer UI', () => {
  const dashboard = read('components/legacy-src/components/views/DashboardView.jsx');
  const leaderboard = read('components/legacy-src/components/views/LeaderboardView.jsx');

  assert.match(dashboard, /id="view-dashboard"/);
  assert.match(dashboard, /dash-stats-grid/);
  assert.doesNotMatch(dashboard, /dash-gl-canvas|dash-stage-wrap|dash-telemetry-hud/);
  assert.match(leaderboard, /id="view-leaderboard"/);
  assert.match(leaderboard, /lb-filter-bar/);
  assert.doesNotMatch(leaderboard, /bs-sort-banner|lb-bs-canvas/);
});

test('visualizer loader and lab route are disconnected from app navigation', () => {
  const appShell = read('components/legacy-src/AppShell.jsx');
  const routeFeature = read('components/layout/RouteFeature.tsx');
  const navigation = read('components/legacy-src/features/navigation/useNavigation.js');
  const home = read('components/home/HomePageView.jsx');

  for (const source of [appShell, routeFeature, home]) {
    assert.doesNotMatch(source, /useFeatureRuntime|LabView/);
  }
  assert.doesNotMatch(navigation, /['"]lab['"]/);
  assert.doesNotMatch(routeFeature, /\blab\s*:/);
});

test('preloader plays the supplied intro clip in slow motion and reveals the homepage at its end', () => {
  const preloader = read('components/shell/TopxPreloader.jsx');
  const styles = read('components/shell/topx-preloader.css');

  assert.match(preloader, /VIDEO_PLAYBACK_RATE = 0\.85/);
  assert.match(preloader, /FADE_DURATION = 2150/);
  assert.match(preloader, /setRevealing\(true\)/);
  assert.match(preloader, /window\.matchMedia\('\(max-width: 700px\)'\)\.matches/);
  assert.match(preloader, /video\.src = videoSource/);
  assert.match(preloader, /video\.load\(\)/);
  assert.match(preloader, /preload="none"/);
  assert.match(preloader, /'\/videos\/topx-intro-mobile\.mp4'/);
  assert.match(preloader, /'\/videos\/topx-intro\.mp4'/);
  assert.match(preloader, /event\.currentTarget\.playbackRate = VIDEO_PLAYBACK_RATE/);
  assert.match(preloader, /onEnded={dismiss}/);
  assert.doesNotMatch(preloader, /VIDEO_END_TIME|topx-video-sharpen|feConvolveMatrix/);
  assert.match(preloader, /onClick={dismiss}/);
  assert.match(preloader, /prefers-reduced-motion:\s*reduce/);
  assert.match(preloader, /window\.innerWidth - document\.documentElement\.clientWidth/);
  assert.match(preloader, /bodyStyle\.paddingRight = `\$\{currentPaddingRight \+ scrollbarWidth\}px`/);
  assert.match(preloader, /bodyStyle\.paddingRight = originalPaddingRight/);
  assert.match(preloader, /const handleVideoError = \(event\) => \{[\s\S]*?clearTransitionTimeout\(\);[\s\S]*?setActive\(false\);/);
  assert.doesNotMatch(preloader, /if \(!active\) \{\s*document\.body\.style\.overflow = ''/);
  assert.match(styles, /\.topx-preloader\.is-revealing\s*\{[^}]*opacity:\s*0/s);
  assert.match(styles, /transition:\s*opacity 2150ms cubic-bezier\(0\.4, 0, 0\.2, 1\)/);
  assert.doesNotMatch(styles, /is-closing|translateX/);
  assert.match(styles, /object-fit:\s*cover/);
  assert.doesNotMatch(styles, /topx-video-sharpen/);
  assert.match(styles, /transform:\s*translateY\(-5vh\)/);
  assert.match(styles, /background:\s*#f1f1f1/);
  assert.doesNotMatch(preloader, /wipe-edge|clip-path/);
  assert.doesNotMatch(styles, /wipe-edge|clip-path/);
  assert.equal(exists('public/videos/topx-intro.mp4'), true);
  assert.equal(exists('public/videos/topx-intro-mobile.mp4'), true);
  assert.ok(
    fs.statSync(path.join(root, 'public/videos/topx-intro-mobile.mp4')).size <
      fs.statSync(path.join(root, 'public/videos/topx-intro.mp4')).size / 5,
    'mobile intro should be at least 80% smaller than the desktop video'
  );
});

test('icon-generation tools remain available', () => {
  assert.equal(exists('scratch/generate_icons.ps1'), true);
  assert.equal(exists('scratch/create_pwa_icons.js'), true);
  assert.equal(exists('public/icons/icon.svg'), true);
  assert.equal(exists('public/icons/icon-192.png'), true);
});
