/**
 * Transitional accessors used while the *_id columns are migrated from
 * names to real record ids. Delete this module in Milestone 4.
 */
export const courseCodeOf = (row) => row?.course_code ?? row?.course_id ?? "";
export const studentEmailOf = (row) => row?.student_email ?? row?.student_id ?? "";
export const tutorEmailOf = (row) => row?.tutor_email ?? row?.tutor_id ?? "";
