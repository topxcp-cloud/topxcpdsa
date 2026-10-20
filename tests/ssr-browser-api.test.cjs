const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const activeSources = [
  ...walk(path.join(root, 'app')),
  ...walk(path.join(root, 'components')),
  ...walk(path.join(root, 'hooks')),
].filter(file => /\.(js|jsx|ts|tsx)$/.test(file));

test('React state initializers do not access browser-only APIs during SSR', () => {
  const browserOnly = /(?:localStorage|sessionStorage|window\.|document\.|location\.|navigator\.|matchMedia\s*\(|ResizeObserver\b|IntersectionObserver\b)/;
  for (const file of activeSources) {
    const source = fs.readFileSync(file, 'utf8');
    const initializers = source.matchAll(/useState\s*\(\s*\(\s*\)\s*=>[\s\S]{0,600}?\)/g);
    for (const match of initializers) {
      assert.doesNotMatch(
        match[0],
        browserOnly,
        `${path.relative(root, file)} has a browser-only API inside a useState initializer`
      );
    }
  }
});

test('sessions and user progress do not use browser storage', () => {
  const admin = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/AdminView.jsx'), 'utf8');
  const roadmap = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/RoadmapsView.jsx'), 'utf8');
  const vault = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/VaultView.jsx'), 'utf8');

  assert.doesNotMatch(admin, /localStorage|sessionStorage/);
  assert.doesNotMatch(roadmap, /localStorage|sessionStorage/);
  assert.doesNotMatch(vault, /localStorage|sessionStorage/);
  assert.match(roadmap, /\/api\/user\/progress\//);
  assert.match(vault, /\/api\/user\/progress\//);
});
