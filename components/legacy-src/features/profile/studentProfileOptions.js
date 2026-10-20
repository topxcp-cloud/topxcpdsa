export const STUDENT_PROFILE_BRANCHES = [
  ['CSE', 'CSE'],
  ['IT', 'IT'],
  ['CSBS', 'CSBS'],
  ['ETC', 'ETC'],
  ['EI', 'EI'],
  ['EEE', 'EEE'],
  ['MECH', 'Mech'],
  ['CIVIL', 'Civil'],
  ['IP', 'IP']
];

export const STUDENT_PROFILE_YEARS = [
  ['First', '1st Year'],
  ['Second', '2nd Year'],
  ['Third', '3rd Year'],
  ['Fourth', '4th Year']
];

export const STUDENT_PROFILE_SECTIONS = ['A', 'B'];

export function hasRequiredStudentProfile(user) {
  return Boolean(
    user?.name?.trim() &&
    String(user?.academicYear || '').trim() &&
    user?.branch?.trim() &&
    user?.section?.trim()
  );
}
