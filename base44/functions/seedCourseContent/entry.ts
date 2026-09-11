import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { CATALOG, expandCatalog } from '../seedCatalog/catalog.ts';

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

function buildTopic(
  course: { code: string; name: string },
  unit: Record<string, any>,
  courseId: string,
  title: string,
  index: number,
) {
  const topicNumber = `${unit.unit_number}.${index}`;
  return {
    unit_id: unit.id,
    course_id: courseId,
    course_code: course.code,
    title,
    topic_number: topicNumber,
    description: `${course.name} Topic ${topicNumber}: ${title}`,
    key_concepts: [title, unit.title, course.name],
    latex_formulas: [],
    lesson_content: `This lesson covers ${title} in ${unit.title} for ${course.name}.`,
    cheatsheet: `Focus: ${title}\nUnit: ${unit.title}\nCourse: ${course.name}`,
    worked_examples: [],
    order: index,
  };
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
    const courseIdByCode = new Map<string, string>(courses.map((c: any) => [c.code, c.id]));
    const units = await listAll(svc.Unit);
    const existingTopics = await listAll(svc.Topic);

    // Idempotency key: a topic is uniquely identified by its unit plus its topic number.
    const seen = new Set(
      existingTopics.map((t: any) => `${t.unit_id}:${t.topic_number}`),
    );

    const unitsByCourseAndNumber = new Map<string, Record<string, any>>();
    for (const unit of units) {
      unitsByCourseAndNumber.set(`${unit.course_id}:${unit.unit_number}`, unit);
      if (unit.course_code) {
        unitsByCourseAndNumber.set(`${unit.course_code}:${unit.unit_number}`, unit);
      }
    }

    const toCreate: Array<Record<string, unknown>> = [];
    const missingUnits: string[] = [];

    for (const course of expandCatalog(CATALOG)) {
      const courseId = courseIdByCode.get(course.code);
      if (!courseId) continue;
      for (const unit of course.units) {
        const unitRow =
          unitsByCourseAndNumber.get(`${courseId}:${unit.number}`) ??
          unitsByCourseAndNumber.get(`${course.code}:${unit.number}`);
        if (!unitRow) {
          missingUnits.push(`${course.code}:${unit.number}`);
          continue;
        }
        unit.topics.forEach((title: string, i: number) => {
          const record = buildTopic(course, unitRow, courseId, title, i + 1);
          if (seen.has(`${unitRow.id}:${record.topic_number}`)) return;
          toCreate.push(record);
        });
      }
    }

    if (!dryRun) {
      for (let i = 0; i < toCreate.length; i += WRITE_BATCH) {
        await svc.Topic.bulkCreate(toCreate.slice(i, i + WRITE_BATCH));
      }
    }

    return Response.json({
      dry_run: dryRun,
      topics_existing: existingTopics.length,
      topics_created: dryRun ? 0 : toCreate.length,
      topics_pending: toCreate.length,
      missing_units: missingUnits,
    });
  } catch (error) {
    console.error('seedCourseContent error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
