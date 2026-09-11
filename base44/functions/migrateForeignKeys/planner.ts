export interface CourseLookup {
  idSet: Set<string>;
  idByCode: Map<string, string>;
}

export interface UserLookup {
  idSet: Set<string>;
  idByEmail: Map<string, string>;
}

export interface PlanReport {
  updates: Array<Record<string, string>>;
  alreadyMigrated: number;
  empty: string[];
  unresolved: Array<{ id: string; value: string }>;
  conflicts: Array<{ id: string; byEmail: string; byCreatedBy: string }>;
  resolvedVia: { email: number; created_by_id: number };
}

function emptyReport(): PlanReport {
  return {
    updates: [], alreadyMigrated: 0, empty: [], unresolved: [],
    conflicts: [], resolvedVia: { email: 0, created_by_id: 0 },
  };
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function planCourseIdUpdates(
  rows: Array<Record<string, any>>,
  lookup: CourseLookup,
): PlanReport {
  const report = emptyReport();

  for (const row of rows) {
    const current = text(row.course_id);
    if (current && lookup.idSet.has(current)) {
      report.alreadyMigrated++;
      continue;
    }
    const code = text(row.course_code) || current;
    if (!code) {
      report.empty.push(row.id);
      continue;
    }
    const targetId = lookup.idByCode.get(code);
    if (!targetId) {
      report.unresolved.push({ id: row.id, value: code });
      continue;
    }
    report.updates.push({ id: row.id, course_id: targetId });
  }

  return report;
}

export function planUserIdUpdates(
  rows: Array<Record<string, any>>,
  lookup: UserLookup,
  idField: 'student_id' | 'tutor_id',
  emailField: 'student_email' | 'tutor_email',
): PlanReport {
  const report = emptyReport();

  for (const row of rows) {
    const current = text(row[idField]);
    if (current && lookup.idSet.has(current)) {
      report.alreadyMigrated++;
      continue;
    }

    const raw = text(row[emailField]) || (current.includes('@') ? current : '');
    const email = raw.toLowerCase();
    if (!email) {
      report.empty.push(row.id);
      continue;
    }

    const byEmail = lookup.idByEmail.get(email);
    const byCreatedBy =
      row.created_by_id && lookup.idSet.has(row.created_by_id) ? String(row.created_by_id) : '';

    if (byEmail && byCreatedBy && byEmail !== byCreatedBy) {
      report.conflicts.push({ id: row.id, byEmail, byCreatedBy });
    }

    // Email is the semantically intended link, so it wins. created_by_id only
    // rescues rows whose email no longer matches any User record.
    if (byEmail) {
      report.updates.push({ id: row.id, [idField]: byEmail });
      report.resolvedVia.email++;
      continue;
    }
    if (byCreatedBy) {
      report.updates.push({ id: row.id, [idField]: byCreatedBy });
      report.resolvedVia.created_by_id++;
      continue;
    }
    report.unresolved.push({ id: row.id, value: email });
  }

  return report;
}
