import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE = 5000;

async function listAll(api: any): Promise<any[]> {
  const out: any[] = [];
  for (let skip = 0; ; ) {
    const page = await api.list('created_date', PAGE, skip);
    if (page.length === 0) break;
    out.push(...page);
    // Advance by what the server actually returned, never by what we asked for.
    // If the platform ever clamps the page size below PAGE, advancing by PAGE
    // would silently skip the unreturned rows; this cannot.
    skip += page.length;
  }
  return out;
}

function tally(): Record<string, number> {
  return { empty: 0, id: 0, code: 0, email: 0, sentinel: 0, unknown: 0 };
}

function classifyCourse(value: unknown, ids: Set<string>, codes: Set<string>) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return 'empty';
  if (ids.has(v)) return 'id';
  if (codes.has(v)) return 'code';
  return 'unknown';
}

function classifyUser(value: unknown, ids: Set<string>) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return 'empty';
  if (v === 'pending') return 'sentinel';
  if (ids.has(v)) return 'id';
  if (v.includes('@')) return 'email';
  return 'unknown';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const svc = base44.asServiceRole.entities;
    const [courses, users, units, topics, questions, enrollments, progress, exams, sessions, payments] =
      await Promise.all([
        listAll(svc.Course), listAll(svc.User), listAll(svc.Unit), listAll(svc.Topic),
        listAll(svc.Question), listAll(svc.Enrollment), listAll(svc.Progress),
        listAll(svc.Exam), listAll(svc.TutoringSession), listAll(svc.Payment),
      ]);

    const courseIds = new Set(courses.map((c: any) => c.id));
    const courseCodes = new Set(courses.map((c: any) => c.code));
    const userIds = new Set(users.map((u: any) => u.id));
    const userEmails = new Set(
      users.map((u: any) => String(u.email || '').trim().toLowerCase()).filter(Boolean),
    );
    const userIdByEmail = new Map<string, string>(
      users
        .filter((u: any) => u.email)
        .map((u: any) => [String(u.email).trim().toLowerCase(), u.id]),
    );

    const duplicateCodes = Object.entries(
      courses.reduce((acc: Record<string, number>, c: any) => {
        acc[c.code] = (acc[c.code] || 0) + 1;
        return acc;
      }, {}),
    ).filter(([, n]) => (n as number) > 1);

    const courseFk: Record<string, Record<string, number>> = {};
    const studentFk: Record<string, Record<string, number>> = {};
    const orphanEmails = new Set<string>();
    const orphanCodes = new Set<string>();
    const createdBy: Record<
      string,
      { rows: number; missing: number; qualifying: number; disagrees: number }
    > = {};

    const courseTables: Array<[string, any[]]> = [
      ['Unit', units], ['Topic', topics], ['Question', questions],
      ['Enrollment', enrollments], ['Progress', progress], ['Exam', exams],
      ['TutoringSession', sessions],
    ];
    for (const [name, rows] of courseTables) {
      const t = tally();
      for (const row of rows) {
        const kind = classifyCourse(row.course_id, courseIds, courseCodes);
        t[kind]++;
        if (kind === 'unknown' && row.course_id) orphanCodes.add(String(row.course_id));
      }
      courseFk[name] = t;
    }

    const studentTables: Array<[string, any[]]> = [
      ['Enrollment', enrollments], ['Progress', progress],
      ['Exam', exams], ['TutoringSession', sessions],
    ];
    for (const [name, rows] of studentTables) {
      const t = tally();
      const cb = { rows: rows.length, missing: 0, qualifying: 0, disagrees: 0 };
      for (const row of rows) {
        const kind = classifyUser(row.student_id, userIds);
        t[kind]++;
        const email = String(row.student_id || '').trim().toLowerCase();
        if (kind === 'email' && !userEmails.has(email)) orphanEmails.add(email);
        if (!row.created_by_id) {
          cb.missing++;
        } else if (kind === 'email' && userEmails.has(email)) {
          // Only rows in this subset can prove or disprove agreement, so the
          // count is reported alongside the disagreements as its denominator.
          cb.qualifying++;
          if (userIdByEmail.get(email) !== row.created_by_id) cb.disagrees++;
        }
      }
      studentFk[name] = t;
      createdBy[name] = cb;
    }

    const tutorFk = tally();
    for (const row of sessions) tutorFk[classifyUser(row.tutor_id, userIds)]++;

    const paymentOrphanEmails = new Set<string>();
    let paymentsWithoutEmail = 0;
    for (const payment of payments) {
      const email = String(payment.email || '').trim().toLowerCase();
      if (!email) {
        paymentsWithoutEmail++;
        continue;
      }
      if (!userEmails.has(email)) paymentOrphanEmails.add(email);
    }

    return Response.json({
      counts: {
        Course: courses.length, User: users.length, Unit: units.length,
        Topic: topics.length, Question: questions.length,
        Enrollment: enrollments.length, Progress: progress.length,
        Exam: exams.length, TutoringSession: sessions.length, Payment: payments.length,
      },
      blockers: {
        units_table_empty: units.length === 0,
        duplicate_course_codes: duplicateCodes,
        course_codes_present: [...courseCodes].sort(),
      },
      course_id_shape: courseFk,
      student_id_shape: studentFk,
      tutor_id_shape: tutorFk,
      orphans: {
        emails_with_no_user: [...orphanEmails].sort(),
        course_values_matching_no_course: [...orphanCodes].sort(),
      },
      created_by_id: createdBy,
      payments: {
        total: payments.length,
        // Payment has no user_id field until a later migration task adds it, so
        // before that point this necessarily equals total. It becomes meaningful
        // only once that field is backfilled.
        without_user_id: payments.filter((p: any) => !p.user_id).length,
        without_email: paymentsWithoutEmail,
        emails_matching_no_user: [...paymentOrphanEmails].sort(),
      },
    });
  } catch (error) {
    console.error('migrationAudit error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
