// Shared by the content generators (enrichCourseContent, generateQuestionBank).

/** Full course names used in prompts, keyed by Course.code. */
export const COURSE_NAMES = {
  AP_CALC_AB: 'AP Calculus AB',
  AP_CALC_BC: 'AP Calculus BC',
  AP_PHYSICS_1: 'AP Physics 1',
  AP_PHYSICS_2: 'AP Physics 2',
  AP_PHYSICS_CM: 'AP Physics C: Mechanics',
  AP_PHYSICS_CE: 'AP Physics C: Electricity and Magnetism',
  AP_CSP: 'AP Computer Science Principles',
  AP_CSA: 'AP Computer Science A',
  AP_STATS: 'AP Statistics',
  AP_PRECALC: 'AP Precalculus',
  AP_MICRO: 'AP Microeconomics',
  AP_MACRO: 'AP Macroeconomics',
  AP_PSYCH: 'AP Psychology',
  AP_USH: 'AP United States History',
};

/** Courses whose prompts need subject-specific guidance beyond the math/science default. */
export const COURSE_SUBJECT = {
  AP_MICRO: 'economics',
  AP_MACRO: 'economics',
  AP_PSYCH: 'psychology',
  AP_USH: 'history',
};

/** Course.code of a Unit/Topic row: legacy rows hold it in course_id, newer rows in course_code. */
export const courseCodeOf = (row) => row.course_code ?? row.course_id;

/** Optional request scope: { course_ids: [codes] } or { course_id: code }. No scope means every course. */
export function courseScope(body) {
  const codes = Array.isArray(body.course_ids) ? body.course_ids : body.course_id ? [body.course_id] : null;
  return (row) => !codes || codes.includes(courseCodeOf(row)) || codes.includes(row.course_id);
}