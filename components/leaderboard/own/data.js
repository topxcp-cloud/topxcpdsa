// Static helpers and options for the leaderboard.
// Pure data transformation functions; no mock or dummy user data.

export const YEAR_LABELS = ['1st', '2nd', '3rd', '4th'];
export const OPTIONS = {
  year: [1, 2, 3, 4],
  branch: ['CSE', 'IT', 'ECE', 'EEE', 'CSBS', 'AIDS', 'MECH', 'CIVIL', 'CHEMICAL'],
  section: ['A', 'B', 'C', 'D'],
};
export const SCOPES = {
  all: 'All',
  year: 'Year',
  branch: 'Branch',
  section: 'Section',
};
export const PAGE_SIZE = 10;
export const NEW_STUDENTS = {};

export function loadMe() {
  return typeof window !== 'undefined' ? window.TOPX_ME || '' : '';
}

export const initials = (n = '') =>
  String(n)
    .trim()
    .split(/\s+/)
    .map((w) => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

export const tagOf = (d) => {
  if (!d) return 'Not set';
  const branch = d.b || d.branch || '';
  const rawY = d.y != null ? Number(d.y) : null;
  const yearText =
    rawY && rawY >= 1 && rawY <= 4
      ? `${YEAR_LABELS[rawY - 1]} year`
      : d.academicYear
      ? `${d.academicYear} Year`
      : '';
  const sec = d.c || d.section ? `Sec ${d.c || d.section}` : '';
  const parts = [branch, yearText, sec].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Cohort not set';
};

export const chipLabel = (scope, v) =>
  scope === 'year'
    ? `${YEAR_LABELS[Number(v) - 1] || v} year`
    : scope === 'section'
    ? `Section ${v}`
    : v;

// Does student d belong to the selected scope?
export function inScope(d, scope, val) {
  if (scope === 'all' || !scope) return true;
  if (!val) return true;

  if (scope === 'year') {
    const dy = d.y != null ? String(d.y) : (d.academicYear ? String(d.academicYear).toLowerCase() : '');
    const vy = String(val).toLowerCase();
    const yrMap = { first: '1', second: '2', third: '3', fourth: '4' };
    const normDy = yrMap[dy] || dy;
    const normVy = yrMap[vy] || vy;
    return normDy === normVy;
  }

  if (scope === 'branch') {
    return String(d.b || d.branch || '').toUpperCase() === String(val).toUpperCase();
  }

  if (scope === 'section') {
    return String(d.c || d.section || '').toUpperCase() === String(val).toUpperCase();
  }

  return true;
}

// Sorted view of real students, ranked only by current streak.
export function buildView(scope, val, students = []) {
  if (!Array.isArray(students)) return { sorted: [], prevRank: {} };
  const list = students.filter((d) => inScope(d, scope, val));
  const sorted = [...list].sort(
    (a, b) =>
      (Number(b.currentStreak) || 0) - (Number(a.currentStreak) || 0) ||
      String(a.n || '').localeCompare(String(b.n || ''))
  );
  const prevRank = {};
  return { sorted, prevRank };
}
