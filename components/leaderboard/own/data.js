// Static helpers and options for the leaderboard.
// Pure data transformation functions; no mock or dummy user data.

export const YEAR_LABELS = ['1st', '2nd', '3rd', '4th'];

export const YEAR_OPTIONS = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' }
];

export const BRANCH_OPTIONS = [
  { value: 'CSE', label: 'CSE' },
  { value: 'CSBS', label: 'CSBS' },
  { value: 'IT', label: 'IT' },
  { value: 'Mechanical', label: 'Mechanical' },
  { value: 'Civil', label: 'Civil' },
  { value: 'EI', label: 'EI' },
  { value: 'ETC', label: 'ETC' },
  { value: 'EEE', label: 'EEE' },
  { value: 'IP', label: 'IP' }
];

export const SECTION_OPTIONS = [
  { value: 'A', label: 'Section A' },
  { value: 'B', label: 'Section B' }
];

export const OPTIONS = {
  year: YEAR_OPTIONS.map((o) => o.value),
  branch: BRANCH_OPTIONS.map((o) => o.value),
  section: SECTION_OPTIONS.map((o) => o.value),
};

export const SCOPES = {
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

export const chipLabel = (scope, v) => {
  if (scope === 'year') {
    const found = YEAR_OPTIONS.find((o) => o.value === Number(v));
    return found ? found.label : `${v} Year`;
  }
  if (scope === 'section') {
    const found = SECTION_OPTIONS.find((o) => o.value === String(v));
    return found ? found.label : `Section ${v}`;
  }
  return v;
};

export function parseYearNumber(y, academicYear) {
  if (y != null && !isNaN(Number(y)) && Number(y) >= 1 && Number(y) <= 4) {
    return Number(y);
  }
  const str = String(academicYear || '').trim().toLowerCase();
  if (!str) return null;
  if (str.startsWith('first') || str.startsWith('1')) return 1;
  if (str.startsWith('second') || str.startsWith('2')) return 2;
  if (str.startsWith('third') || str.startsWith('3')) return 3;
  if (str.startsWith('fourth') || str.startsWith('4')) return 4;
  return null;
}

export function matchBranch(studentBranchRaw, targetBranch) {
  if (!targetBranch) return true;
  const sb = String(studentBranchRaw || '').trim().toUpperCase();
  const tb = String(targetBranch).trim().toUpperCase();
  if (tb === 'MECHANICAL' || tb === 'MECH') {
    return sb === 'MECH' || sb === 'MECHANICAL';
  }
  if (tb === 'CIVIL') {
    return sb === 'CIVIL';
  }
  return sb === tb;
}

export function matchSection(studentSecRaw, targetSec) {
  if (!targetSec) return true;
  const ss = String(studentSecRaw || '').trim().toUpperCase();
  const ts = String(targetSec).replace(/^SECTION\s+/i, '').trim().toUpperCase();
  return ss === ts;
}

// Does student d belong to the selected filters?
export function inScope(d, scopeOrFilters, val) {
  if (!d) return false;

  if (typeof scopeOrFilters === 'object' && scopeOrFilters !== null && !Array.isArray(scopeOrFilters)) {
    const { year, branch, section, query } = scopeOrFilters;
    if (year != null && year !== '') {
      const studentYear = parseYearNumber(d.y, d.academicYear);
      if (studentYear !== Number(year)) return false;
    }
    if (branch != null && branch !== '' && branch !== 'all') {
      if (!matchBranch(d.b || d.branch, branch)) return false;
    }
    if (section != null && section !== '' && section !== 'all') {
      if (!matchSection(d.c || d.section, section)) return false;
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      const n = String(d.n || '').toLowerCase();
      const b = String(d.b || d.branch || '').toLowerCase();
      const sec = String(d.c || d.section || '').toLowerCase();
      if (!n.includes(q) && !b.includes(q) && !sec.includes(q)) return false;
    }
    return true;
  }

  const scope = scopeOrFilters;
  if (scope === 'all' || !scope || !val) return true;
  if (scope === 'year') {
    const studentYear = parseYearNumber(d.y, d.academicYear);
    return studentYear === Number(val);
  }
  if (scope === 'branch') {
    return matchBranch(d.b || d.branch, val);
  }
  if (scope === 'section') {
    return matchSection(d.c || d.section, val);
  }

  return true;
}

// Sorted view of real students, ranked only by current streak.
export function buildView(filtersOrScope, valOrStudents, maybeStudents) {
  let students = [];
  let filterParam = null;

  if (typeof filtersOrScope === 'object' && filtersOrScope !== null && !Array.isArray(filtersOrScope)) {
    filterParam = filtersOrScope;
    students = Array.isArray(valOrStudents) ? valOrStudents : [];
  } else {
    const scope = filtersOrScope;
    const val = valOrStudents;
    students = Array.isArray(maybeStudents) ? maybeStudents : [];
    filterParam = { scope, val };
  }

  if (!Array.isArray(students)) return { sorted: [], prevRank: {} };
  const list = students.filter((d) => {
    if (filterParam && filterParam.scope !== undefined) {
      return inScope(d, filterParam.scope, filterParam.val);
    }
    return inScope(d, filterParam);
  });

  const sorted = [...list].sort(
    (a, b) =>
      (Number(b.currentStreak) || 0) - (Number(a.currentStreak) || 0) ||
      String(a.n || '').localeCompare(String(b.n || ''))
  );
  const prevRank = {};
  return { sorted, prevRank };
}
