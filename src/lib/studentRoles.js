/**
 * Roles that count as students in admin rosters and reports.
 * Platform invites may leave role as "user"; app default is "student".
 */
export function isStudentRole(role) {
  return role === "student" || role === "user" || !role;
}

export function filterStudents(users) {
  return (users || []).filter((u) => isStudentRole(u.role));
}
