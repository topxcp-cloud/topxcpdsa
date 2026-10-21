const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('complete original TOP-X frontend assets are available under /legacy', () => {
  for (const file of [
    'public/legacy/index.html',
    'public/legacy/css/style.css',
    'public/legacy/js/app.js',
    'public/legacy/js/data.js',
    'public/legacy/js/visualizers.js',
    'public/legacy/js/three.min.js'
  ]) assert.ok(fs.existsSync(path.join(root, file)), `${file} is missing`);
  const html = fs.readFileSync(path.join(root, 'public/legacy/index.html'), 'utf8');
  assert.match(html, /js\/app\.js/);
  assert.match(html, /js\/data\.js/);
  assert.match(html, /js\/visualizers\.js/);
});

test('original source archive retains server, API and all major frontend sources', () => {
  for (const file of [
    'legacy-reference/original/server.js',
    'legacy-reference/original/api/index.js',
    'legacy-reference/original/index.html',
    'legacy-reference/original/css/style.css',
    'legacy-reference/original/js/app.js',
    'legacy-reference/original/js/data.js',
    'legacy-reference/original/js/visualizers.js',
    'legacy-reference/original/js/three.min.js',
    'legacy-reference/original/tests/api.test.js'
  ]) assert.ok(fs.existsSync(path.join(root, file)), `${file} is missing`);
});
