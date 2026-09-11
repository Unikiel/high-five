import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { planCourseIdUpdates, planUserIdUpdates, type PlanReport } from './planner.ts';

const PAGE = 5000;
const MAX_REQUESTS = 1000;
const BULK = 500;

const COURSE_TABLES = [
  'Unit', 'Topic', 'Question', 'Enrollment', 'Progress', 'Exam', 'TutoringSession',
] as const;
const STUDENT_TABLES = ['Enrollment', 'Progress', 'Exam', 'TutoringSession'] as const;

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

function summarise(report: PlanReport) {
  return {
    pending: report.updates.length,
    already_migrated: report.alreadyMigrated,
    empty: report.empty.length,
    unresolved: report.unresolved,
    conflicts: report.conflicts,
    resolved_via: report.resolvedVia,
  };
}

async function apply(api: any, updates: Array<Record<string, string>>) {
  for (let i = 0; i < updates.length; i += BULK) {
    await api.bulkUpdate(updates.slice(i, i + BULK));
  }
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

    const courses = await listAll(svc.Course);
    const courseLookup = {
      idSet: new Set<string>(courses.map((c: any) => c.id)),
      idByCode: new Map<string, string>(courses.map((c: any) => [c.code, c.id])),
    };

    const users = await listAll(svc.User);
    const userLookup = {
      idSet: new Set<string>(users.map((u: any) => u.id)),
      idByEmail: new Map<string, string>(
        users
          .filter((u: any) => u.email)
          .map((u: any) => [String(u.email).trim().toLowerCase(), u.id]),
      ),
    };

    const result: Record<string, unknown> = { dry_run: dryRun, course_id: {}, student_id: {}, tutor_id: {} };
    const rowCache = new Map<string, any[]>();
    const load = async (name: string) => {
      if (!rowCache.has(name)) rowCache.set(name, await listAll(svc[name]));
      return rowCache.get(name)!;
    };

    for (const name of COURSE_TABLES) {
      const report = planCourseIdUpdates(await load(name), courseLookup);
      (result.course_id as any)[name] = summarise(report);
      if (!dryRun) await apply(svc[name], report.updates);
    }

    for (const name of STUDENT_TABLES) {
      const report = planUserIdUpdates(await load(name), userLookup, 'student_id', 'student_email');
      (result.student_id as any)[name] = summarise(report);
      if (!dryRun) await apply(svc[name], report.updates);
    }

    const tutorReport = planUserIdUpdates(
      await load('TutoringSession'), userLookup, 'tutor_id', 'tutor_email',
    );
    (result.tutor_id as any).TutoringSession = summarise(tutorReport);
    if (!dryRun) await apply(svc.TutoringSession, tutorReport.updates);

    return Response.json(result);
  } catch (error) {
    console.error('migrateForeignKeys error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
