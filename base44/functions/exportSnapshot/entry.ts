import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE = 5000;
const MAX_REQUESTS = 1000;

const ALL_ENTITIES = [
  'Course', 'Unit', 'Topic', 'Question',
  'Enrollment', 'Progress', 'Exam', 'TutoringSession', 'Payment', 'User',
];

// Every field this migration can write, plus the keys needed to identify a row
// and to rebuild an identity link. Restoring these is sufficient for every
// rollback in this plan, because rollback updates existing rows by id rather
// than recreating them.
//
// This is not only the foreign keys: the catalog seeder also diffs and overwrites
// the presentation fields on Course and Unit, so those have to be here too or an
// admin's customised colour or exam weighting could not be restored.
//
// Transitional fields (student_email, course_code, tutor_email, user_id) are
// listed before they exist; `pick` simply skips whatever is absent.
const FK_FIELDS: Record<string, string[]> = {
  Course: ['id', 'code', 'name', 'color', 'icon', 'description', 'order'],
  Unit: ['id', 'course_id', 'course_code', 'unit_number', 'title', 'exam_weight_min', 'exam_weight_max', 'order'],
  Topic: ['id', 'course_id', 'course_code', 'unit_id', 'topic_number', 'title'],
  Question: ['id', 'course_id', 'course_code', 'unit_id', 'topic_id'],
  Enrollment: ['id', 'student_id', 'student_email', 'course_id', 'course_code', 'created_by_id'],
  Progress: ['id', 'student_id', 'student_email', 'course_id', 'course_code', 'unit_id', 'topic_id', 'created_by_id'],
  Exam: ['id', 'student_id', 'student_email', 'course_id', 'course_code', 'unit_id', 'created_by_id'],
  TutoringSession: ['id', 'student_id', 'student_email', 'tutor_id', 'tutor_email', 'course_id', 'course_code', 'created_by_id'],
  Payment: ['id', 'email', 'user_id', 'plan_id'],
  User: ['id', 'email', 'full_name', 'role'],
};

// User is never exported in full, even in full mode: nothing in this migration
// needs more than the identity link, and the rest is personal data.
const USER_FIELDS = FK_FIELDS.User;

async function listAll(api: any): Promise<any[]> {
  const out: any[] = [];
  for (let skip = 0, requests = 0; ; ) {
    // The loop stops on an empty page, so a backend that ignored `skip` and kept
    // returning the same page would grow `out` until the isolate died. At 5000
    // rows a page this ceiling still allows five million rows per table.
    if (++requests > MAX_REQUESTS) {
      throw new Error(
        `listAll exceeded ${MAX_REQUESTS} requests after ${out.length} rows; the backend is probably ignoring skip`,
      );
    }
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

function pick(row: any, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (row[field] !== undefined) out[field] = row[field];
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // Both knobs are validated strictly and fail loudly. A typo must never
    // quietly produce a smaller backup than the caller believes they asked for —
    // this file is the only way back from the foreign-key rewrite.
    if (body?.mode !== undefined && body.mode !== 'fk' && body.mode !== 'full') {
      return Response.json(
        { error: `Unknown mode ${JSON.stringify(body.mode)}. Valid modes: fk, full.` },
        { status: 400 },
      );
    }
    const mode = body?.mode === 'full' ? 'full' : 'fk';

    if (body?.entities !== undefined && !Array.isArray(body.entities)) {
      return Response.json(
        { error: 'entities must be an array of entity names.' },
        { status: 400 },
      );
    }
    const unknown = (body?.entities ?? []).filter((name: string) => !ALL_ENTITIES.includes(name));
    if (unknown.length > 0) {
      return Response.json(
        {
          error: `Unknown entities: ${unknown.join(', ')}. Valid names: ${ALL_ENTITIES.join(', ')}`,
        },
        { status: 400 },
      );
    }
    const requested: string[] =
      Array.isArray(body?.entities) && body.entities.length > 0 ? body.entities : ALL_ENTITIES;

    const svc = base44.asServiceRole.entities;
    const data: Record<string, any[]> = {};
    // Sequential on purpose: ten concurrent full-table reads is the most likely
    // way to exhaust the isolate's memory.
    for (const name of requested) {
      const rows = await listAll(svc[name]);
      if (name === 'User') data[name] = rows.map((row: any) => pick(row, USER_FIELDS));
      else if (mode === 'full') data[name] = rows;
      else data[name] = rows.map((row: any) => pick(row, FK_FIELDS[name]));
    }

    return Response.json({
      taken_at: new Date().toISOString(),
      mode,
      // Restated so a saved file is self-describing and its scope is never guessed.
      note:
        mode === 'fk'
          ? 'Foreign-key fields only. Sufficient to roll back this migration, which updates rows by id. NOT a full archival backup.'
          : 'All fields except User, which is always reduced to the identity link.',
      entities: requested,
      counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
      data,
    });
  } catch (error) {
    console.error('exportSnapshot error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
