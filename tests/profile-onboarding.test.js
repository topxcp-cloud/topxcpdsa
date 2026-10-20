const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('signed-in users must save their student profile before continuing', () => {
  const shell = fs.readFileSync(path.join(root, 'components/legacy-src/AppShell.jsx'), 'utf8');
  const setup = fs.readFileSync(path.join(root, 'components/legacy-src/components/shell/StudentProfileSetup.jsx'), 'utf8');
  const routeFeature = fs.readFileSync(path.join(root, 'components/layout/RouteFeature.tsx'), 'utf8');
  const homePage = fs.readFileSync(path.join(root, 'components/home/HomePageView.jsx'), 'utf8');
  const options = fs.readFileSync(path.join(root, 'components/legacy-src/features/profile/studentProfileOptions.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'app/legacy.css'), 'utf8');

  assert.match(shell, /auth\.user && !hasRequiredStudentProfile\(auth\.user\)/);
  assert.match(routeFeature, /!auth\.loading && auth\.user && !hasRequiredStudentProfile\(auth\.user\)/);
  assert.match(homePage, /!auth\.loading && auth\.user && !hasRequiredStudentProfile\(auth\.user\)/);
  assert.match(routeFeature, /addEventListener\('topx:profile-updated', handleProfileUpdated\)/);
  assert.match(shell, /navigate\('profile'\)/);
  assert.match(setup, /academicYear,/);
  assert.match(setup, /name: name\.trim\(\)/);
  assert.match(setup, /branch: branch\.trim\(\)/);
  assert.match(setup, /section: section\.trim\(\)/);
  assert.match(setup, /<span>Year<\/span>/);
  assert.match(setup, /className="student-setup-fields"/);
  assert.match(setup, /aria-describedby="student-setup-copy"/);
  assert.match(styles, /\.student-setup-backdrop\s*\{[^}]*place-items:\s*safe center/s);
  assert.match(styles, /\.student-setup-fields\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(styles, /@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.student-setup-fields\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(options, /\['CSE', 'CSE'\][\s\S]*?\['IT', 'IT'\][\s\S]*?\['CSBS', 'CSBS'\][\s\S]*?\['ETC', 'ETC'\][\s\S]*?\['EI', 'EI'\][\s\S]*?\['EEE', 'EEE'\][\s\S]*?\['MECH', 'Mech'\][\s\S]*?\['CIVIL', 'Civil'\][\s\S]*?\['IP', 'IP'\]/);
  assert.match(options, /STUDENT_PROFILE_SECTIONS = \['A', 'B'\]/);
  assert.match(options, /user\?\.academicYear/);
  assert.match(setup, /api\(`\/api\/user\/profile\/\$\{encodeURIComponent\(user\.id\)\}`/);
});

test('profile details switch to edit mode after the first save and guide users to handles', () => {
  const profile = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/ProfileView.jsx'), 'utf8');

  assert.match(profile, /setEditingProfile\(false\)/);
  assert.match(profile, /profileSaved \? 'Update Profile' : 'Save Profile'/);
  assert.match(profile, /hydratedUserId = useRef/);
  assert.match(profile, /if \(isNewUser \|\| completedDuringSetup\) setEditingProfile\(!isComplete\)/);
  assert.match(profile, /type="button"[\s\S]*?id="page-profile-save"[\s\S]*?if \(editingProfile\) \{\s*handleSaveProfile\(\)/);
  assert.match(profile, /Edit Profile/);
  assert.match(profile, /Save Profile/);
  assert.match(profile, /profile-handle-nudge/);
  assert.match(profile, /Scroll down/);
  assert.match(profile, /scrollIntoView\(\{ behavior: 'smooth'/);
  assert.ok(profile.indexOf('profile-handle-nudge') < profile.indexOf('Unified Coding Stats'));
  assert.doesNotMatch(profile, /page-profile-college-input|College \/ Institution/);
  assert.match(profile, /required[\s\S]*?STUDENT_PROFILE_YEARS\.map/);
  assert.match(profile, /STUDENT_PROFILE_BRANCHES\.map/);
  assert.match(profile, /STUDENT_PROFILE_SECTIONS\.map/);
});

test('coding handles autosave on field exit and stay synchronized with persistent user data', () => {
  const profile = fs.readFileSync(path.join(root, 'components/legacy-src/components/views/ProfileView.jsx'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'components/legacy-src/AppShell.jsx'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'lib/api/route-registry.cjs'), 'utf8');

  assert.match(profile, /handleSaveQueue = useRef/);
  assert.equal((profile.match(/onBlur=\{\(e\) => handleSaveHandles\(/g) || []).length, 3);
  assert.match(profile, /updateAuthUser\(updated\)/);
  assert.match(profile, /updateAuthUser\(res\.user\)/);
  assert.match(profile, /dispatchEvent\(new CustomEvent\('topx:profile-updated', \{ detail: \{ user: updated \} \}\)\)/);
  assert.match(profile, /dispatchEvent\(new CustomEvent\('topx:profile-updated', \{ detail: \{ user: res\.user \} \}\)\)/);
  assert.doesNotMatch(shell, /target\.closest\('#page-profile-sync'\)/);

  const handleRoute = api.slice(api.indexOf("app.put('/api/user/handles/:id'"), api.indexOf('// ---------------------------------------------------------------------------\n// 2. LIVE PLATFORM'));
  const syncRoute = api.slice(api.indexOf("app.post('/api/sync/all/:id'"), api.indexOf('// ---------------------------------------------------------------------------\n// 3. TOP-X PRO'));
  assert.match(handleRoute, /await updateUser\(/);
  assert.match(handleRoute, /platformStatsStatements\(latest/);
  assert.match(syncRoute, /await updateUser\(/);
  assert.match(syncRoute, /platformStatsStatements\(latest/);
  assert.match(api, /storage: 'postgres'/);
});
