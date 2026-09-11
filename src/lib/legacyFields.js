/**
 * Transitional accessors used while the *_id columns are migrated from
 * names to real record ids. Delete this module in Milestone 4.
 */
export const courseCodeOf = (row) => row?.course_code ?? row?.course_id ?? "";
export const studentEmailOf = (row) => row?.student_email ?? row?.student_id ?? "";
export const tutorEmailOf = (row) => row?.tutor_email ?? row?.tutor_id ?? "";

/**
 * Match rows that already have the transitional field OR still store the
 * name in the lying *_id column. Required until backfillLegacyNames has run
 * on production — a filter on student_email alone would hide every old row.
 */
export const byStudentEmail = (email) => ({
  $or: [{ student_email: email }, { student_id: email }],
});

export const byCourseCode = (code) => ({
  $or: [{ course_code: code }, { course_id: code }],
});

export const byStudentAndCourse = (email, code) => ({
  $or: [
    { student_email: email, course_code: code },
    { student_email: email, course_id: code },
    { student_id: email, course_code: code },
    { student_id: email, course_id: code },
  ],
});

export const byCourseCodeAndUnit = (code, unitNumber) => ({
  $or: [
    { course_code: code, unit_number: unitNumber },
    { course_id: code, unit_number: unitNumber },
  ],
});
