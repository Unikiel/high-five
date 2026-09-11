import { type CatalogCourse, type CatalogUnit, expandCatalog, parseWeight } from './catalog.ts';

export interface CoursePlan {
  create: Array<Record<string, unknown>>;
  update: Array<{ id: string; data: Record<string, unknown> }>;
  unchanged: number;
  duplicateCodes: string[];
}

/** Records a key once, so a plan names each problem row a single time. */
function report(keys: string[], key: string): void {
  if (!keys.includes(key)) keys.push(key);
}

/**
 * Drops undefined-valued keys. `parseWeight('Not assessed')` yields no min/max,
 * and a payload carrying `exam_weight_min: undefined` is not the same thing as a
 * payload without the field: the SDK would either send an explicit null or drop
 * the key on serialisation, neither of which the caller asked for.
 */
function defined(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(record)) {
    if (value !== undefined) out[field] = value;
  }
  return out;
}

// Payloads below name every field explicitly and never spread an expanded
// course. An expanded course still carries `units`, which Base44 has no column
// for, so spreading it would send a junk field on every create.
const COURSE_FIELDS = ['name', 'color', 'icon', 'description', 'order'] as const;

export function planCourseUpserts(
  catalog: CatalogCourse[],
  existing: Array<Record<string, any>>,
): CoursePlan {
  const seen = new Map<string, Record<string, any>>();
  const duplicateCodes: string[] = [];
  for (const row of existing) {
    if (seen.has(row.code)) {
      report(duplicateCodes, row.code);
      continue;
    }
    seen.set(row.code, row);
  }

  const plan: CoursePlan = { create: [], update: [], unchanged: 0, duplicateCodes };

  for (const course of catalog) {
    const row = seen.get(course.code);
    if (!row) {
      plan.create.push({
        code: course.code, name: course.name, color: course.color, icon: course.icon,
        description: course.description, order: course.order, is_active: true,
      });
      continue;
    }
    // is_active is deliberately absent from COURSE_FIELDS: an admin who hides a
    // course should not have it silently reactivated by the next reseed.
    const data: Record<string, unknown> = {};
    for (const field of COURSE_FIELDS) {
      if (row[field] !== course[field]) data[field] = course[field];
    }
    if (Object.keys(data).length > 0) plan.update.push({ id: row.id, data });
    else plan.unchanged++;
  }

  return plan;
}

export interface UnitPlan {
  create: Array<Record<string, unknown>>;
  update: Array<{ id: string; data: Record<string, unknown> }>;
  unchanged: number;
  skippedCourses: string[];
  /**
   * `<course code>:<unit number>` for every unit the database holds more than
   * one row for. Only one of those rows is reachable by the lookup below, so the
   * rest would drift forever; the caller is expected to refuse to write until an
   * operator merges them, exactly as it does for duplicateCodes.
   */
  duplicateUnits: string[];
  /**
   * `<course code>:<unit number>` for every unit whose stored exam weight the
   * catalog no longer assesses. No write is planned (see the diff below), so
   * these are reported rather than silently counted as converged.
   */
  staleWeights: string[];
}

const unitKey = (courseId: string, unitNumber: number) => `${courseId}:${unitNumber}`;

export function planUnitUpserts(
  catalog: CatalogCourse[],
  existing: Array<Record<string, any>>,
  courseIdByCode: Map<string, string>,
): UnitPlan {
  const plan: UnitPlan = {
    create: [], update: [], unchanged: 0,
    skippedCourses: [], duplicateUnits: [], staleWeights: [],
  };

  const codeById = new Map<string, string>();
  for (const [code, id] of courseIdByCode) codeById.set(id, code);

  /** Human-readable enough for an operator to find the rows in the admin UI. */
  const label = (row: Record<string, any>): string => {
    const courseId = String(row.course_id);
    const code = codeById.get(courseId) ?? row.course_code ?? courseId;
    return unitKey(String(code), Number(row.unit_number));
  };

  // Index existing units by both the id-based key and the legacy code-based key,
  // because pre-migration rows still hold a course code in course_id. First row
  // wins, and any later row sharing a key is reported: overwriting the entry
  // would make the earlier row an unreachable orphan that no run ever mentions.
  const byKey = new Map<string, Record<string, any>>();
  for (const row of existing) {
    const key = unitKey(String(row.course_id), Number(row.unit_number));
    if (byKey.has(key)) {
      report(plan.duplicateUnits, label(row));
      continue;
    }
    byKey.set(key, row);
  }

  for (const course of expandCatalog(catalog)) {
    const courseId = courseIdByCode.get(course.code);
    if (!courseId) {
      plan.skippedCourses.push(course.code);
      continue;
    }

    course.units.forEach((unit: CatalogUnit, index: number) => {
      const weight = parseWeight(unit.weight);
      const desired = {
        course_id: courseId,
        course_code: course.code,
        unit_number: unit.number,
        title: unit.title,
        exam_weight_min: weight.min,
        exam_weight_max: weight.max,
        order: index + 1,
      };

      const byId = byKey.get(unitKey(courseId, unit.number));
      const byCode = byKey.get(unitKey(course.code, unit.number));
      // A partially-migrated table can hold both a legacy row and a migrated row
      // for the same unit. They land under different keys, so indexing above
      // cannot see the clash — only this two-key lookup can.
      if (byId && byCode && byId !== byCode) {
        report(plan.duplicateUnits, unitKey(course.code, unit.number));
      }
      const row = byId ?? byCode;

      if (!row) {
        plan.create.push(defined(desired));
        return;
      }

      const data: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(desired)) {
        if (value === undefined) {
          // The catalog no longer assesses this unit. Clearing a stored number
          // is not expressible through update() — an undefined value writes
          // nothing, so emitting the key would produce an update that never
          // converges and is replanned on every run. Leave the value and say so.
          if (row[field] !== undefined && row[field] !== null) {
            report(plan.staleWeights, unitKey(course.code, unit.number));
          }
          continue;
        }
        if (row[field] !== value) data[field] = value;
      }
      if (Object.keys(data).length > 0) plan.update.push({ id: row.id, data });
      else plan.unchanged++;
    });
  }

  return plan;
}
