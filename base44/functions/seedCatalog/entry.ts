import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { CATALOG } from './catalog.ts';
import { planCourseUpserts, planUnitUpserts } from './planner.ts';

const PAGE = 5000;
const MAX_REQUESTS = 1000;
const WRITE_BATCH = 100;

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

async function applyCreates(api: any, records: Array<Record<string, unknown>>) {
  for (let i = 0; i < records.length; i += WRITE_BATCH) {
    await api.bulkCreate(records.slice(i, i + WRITE_BATCH));
  }
}

async function applyUpdates(api: any, updates: Array<{ id: string; data: Record<string, unknown> }>) {
  for (const { id, data } of updates) await api.update(id, data);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default to a dry run; caller must opt in to writing
    const svc = base44.asServiceRole.entities;

    const coursePlan = planCourseUpserts(CATALOG, await listAll(svc.Course));
    if (coursePlan.duplicateCodes.length > 0) {
      return Response.json({
        error: 'Duplicate course codes found. Resolve them in /admin/courses before seeding.',
        duplicateCodes: coursePlan.duplicateCodes,
      }, { status: 409 });
    }

    if (!dryRun) {
      await applyCreates(svc.Course, coursePlan.create);
      await applyUpdates(svc.Course, coursePlan.update);
    }

    // Re-read courses so newly created rows contribute their ids. On a dry run
    // the creates did not happen, so those codes genuinely have no id yet — but
    // every course that already exists still does, and resolving those is what
    // makes a dry run against a partially seeded database informative.
    const courses = await listAll(svc.Course);
    const courseIdByCode = new Map<string, string>(courses.map((c: any) => [c.code, c.id]));

    const unitPlan = planUnitUpserts(CATALOG, await listAll(svc.Unit), courseIdByCode);

    // Units get the same duplicate guard courses get. It cannot be a clean 409
    // like the course one, because the course writes above have already landed,
    // so report the course outcome and refuse only the unit writes.
    const unitsBlocked = unitPlan.duplicateUnits.length > 0;
    if (!dryRun && !unitsBlocked) {
      await applyCreates(svc.Unit, unitPlan.create);
      await applyUpdates(svc.Unit, unitPlan.update);
    }

    return Response.json({
      dry_run: dryRun,
      courses: {
        created: coursePlan.create.length,
        updated: coursePlan.update.length,
        unchanged: coursePlan.unchanged,
      },
      units: {
        // planned_* rather than created/updated when blocked, so the numbers are
        // never mistaken for work that actually happened.
        applied: !dryRun && !unitsBlocked,
        created: unitPlan.create.length,
        updated: unitPlan.update.length,
        unchanged: unitPlan.unchanged,
        skipped_courses: unitPlan.skippedCourses,
        duplicate_units: unitPlan.duplicateUnits,
        stale_weights: unitPlan.staleWeights,
      },
      ...(unitsBlocked
        ? {
            error:
              'Duplicate Unit rows found; no unit writes were performed. Resolve the rows listed in units.duplicate_units and re-run.',
          }
        : {}),
    });
  } catch (error) {
    console.error('seedCatalog error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
