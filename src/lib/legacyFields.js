/**
 * Transitional accessors used while the *_id columns are migrated from
 * names to real record ids. Delete this module in Milestone 4.
 */
export const courseCodeOf = (row) => row?.course_code ?? row?.course_id ?? "";
export const studentEmailOf = (row) => row?.student_email ?? row?.student_id ?? "";
export const tutorEmailOf = (row) => row?.tutor_email ?? row?.tutor_id ?? "";

/**
 * Match rows keyed by User.id (post-migration) OR email (legacy / transitional).
 * Keeps the site working before and after migrateForeignKeys runs.
 */
export const byStudent = (user) => {
  const clauses = [];
  if (user?.id) clauses.push({ student_id: user.id });
  if (user?.email) {
    clauses.push({ student_email: user.email });
    clauses.push({ student_id: user.email });
  }
  if (clauses.length === 0) return { student_id: "__none__" };
  if (clauses.length === 1) return clauses[0];
  return { $or: clauses };
};

/** Admin detail / invite routes still key by email string. */
export const byStudentEmail = (email) => {
  if (!email) return { student_id: "__none__" };
  return {
    $or: [{ student_email: email }, { student_id: email }],
  };
};

export const byCourseCode = (code) => ({
  $or: [{ course_code: code }, { course_id: code }],
});

export const byStudentAndCourse = (user, code) => {
  const studentClauses = [];
  if (user?.id) studentClauses.push(user.id);
  if (user?.email) studentClauses.push(user.email);
  const clauses = [];
  for (const studentKey of studentClauses) {
    clauses.push({ student_id: studentKey, course_code: code });
    clauses.push({ student_id: studentKey, course_id: code });
    if (user?.email && studentKey === user.email) {
      clauses.push({ student_email: user.email, course_code: code });
      clauses.push({ student_email: user.email, course_id: code });
    }
  }
  if (user?.id && user?.email) {
    clauses.push({ student_email: user.email, course_code: code });
    clauses.push({ student_email: user.email, course_id: code });
  }
  return clauses.length ? { $or: clauses } : { student_id: "__none__" };
};

export const byCourseCodeAndUnit = (code, unitNumber) => ({
  $or: [
    { course_code: code, unit_number: unitNumber },
    { course_id: code, unit_number: unitNumber },
  ],
});

/** In-memory: row belongs to this user (id or email). */
export const matchesStudent = (row, userOrEmail) => {
  if (!row) return false;
  if (typeof userOrEmail === "string") {
    const email = userOrEmail.toLowerCase();
    return (
      (row.student_email || "").toLowerCase() === email ||
      (row.student_id || "").toLowerCase() === email
    );
  }
  const email = (userOrEmail?.email || "").toLowerCase();
  const id = userOrEmail?.id;
  return (
    (id && row.student_id === id) ||
    (email && (row.student_email || "").toLowerCase() === email) ||
    (email && (row.student_id || "").toLowerCase() === email)
  );
};

/** In-memory: row belongs to this course (id or code). */
export const matchesCourse = (row, course) => {
  if (!row || !course) return false;
  const code = courseCodeOf(row);
  return (
    (course.id && row.course_id === course.id) ||
    (course.code && code === course.code) ||
    (course.code && row.course_id === course.code)
  );
};
