import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE = 5000;
const MAX_REQUESTS = 1000;
const BULK = 500;

const TABLES = ['Enrollment', 'Progress', 'Exam', 'TutoringSession'] as const;

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;
    const svc = base44.asServiceRole.entities;
    const report: Record<string, { pending: number; written: number }> = {};

    for (const name of TABLES) {
      const rows = await listAll(svc[name]);
      const updates: Array<Record<string, unknown>> = [];

      for (const row of rows) {
        const patch: Record<string, unknown> = { id: row.id };
        let changed = false;

        // Only copy when the source still looks like a name and the target is empty.
        const student = String(row.student_id ?? '').trim();
        if (!row.student_email && student.includes('@')) {
          patch.student_email = student.toLowerCase();
          changed = true;
        }
        const course = String(row.course_id ?? '').trim();
        if (!row.course_code && course && !course.includes('@')) {
          patch.course_code = course;
          changed = true;
        }
        if (name === 'TutoringSession') {
          const tutor = String(row.tutor_id ?? '').trim();
          if (!row.tutor_email && tutor.includes('@')) {
            patch.tutor_email = tutor.toLowerCase();
            changed = true;
          }
        }

        if (changed) updates.push(patch);
      }

      report[name] = { pending: updates.length, written: 0 };
      if (!dryRun) {
        for (let i = 0; i < updates.length; i += BULK) {
          await svc[name].bulkUpdate(updates.slice(i, i + BULK));
        }
        report[name].written = updates.length;
      }
    }

    return Response.json({ dry_run: dryRun, report });
  } catch (error) {
    console.error('backfillLegacyNames error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
