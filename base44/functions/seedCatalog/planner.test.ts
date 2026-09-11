import { describe, expect, it } from 'vitest';
import { CATALOG, type CatalogCourse } from './catalog.ts';
import { planCourseUpserts, planUnitUpserts } from './planner.ts';

const catalog = [
  {
    code: 'AP_X', name: 'AP X', color: '#111', icon: 'X', description: 'd', order: 1,
    units: [
      { number: 1, title: 'One', weight: '10-12%', topics: ['t1'] },
      { number: 2, title: 'Two', weight: '5%', topics: ['t2'] },
    ],
  },
];

/** Mimics the round trip through Base44: JSON drops undefined-valued keys. */
const stored = (records: Array<Record<string, unknown>>, prefix = 'u') =>
  (JSON.parse(JSON.stringify(records)) as Array<Record<string, any>>).map((row, i) => ({
    ...row,
    id: `${prefix}${i + 1}`,
  }));

describe('planCourseUpserts', () => {
  it('creates a course that does not exist', () => {
    const plan = planCourseUpserts(catalog, []);
    expect(plan.create).toHaveLength(1);
    expect(plan.create[0].code).toBe('AP_X');
    expect(plan.update).toHaveLength(0);
  });

  it('is a no-op when the course already matches', () => {
    const existing = [{
      id: 'c1', code: 'AP_X', name: 'AP X', color: '#111', icon: 'X',
      description: 'd', order: 1, is_active: true,
    }];
    const plan = planCourseUpserts(catalog, existing);
    expect(plan.create).toHaveLength(0);
    expect(plan.update).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });

  it('updates presentation fields but never the code', () => {
    const existing = [{
      id: 'c1', code: 'AP_X', name: 'Old Name', color: '#111', icon: 'X',
      description: 'd', order: 1, is_active: true,
    }];
    const plan = planCourseUpserts(catalog, existing);
    expect(plan.update).toEqual([{ id: 'c1', data: { name: 'AP X' } }]);
    expect(plan.update[0].data).not.toHaveProperty('code');
  });

  it('reports duplicate codes instead of guessing', () => {
    const existing = [
      { id: 'c1', code: 'AP_X', name: 'AP X', color: '#111', icon: 'X', description: 'd', order: 1, is_active: true },
      { id: 'c2', code: 'AP_X', name: 'AP X', color: '#111', icon: 'X', description: 'd', order: 1, is_active: true },
    ];
    const plan = planCourseUpserts(catalog, existing);
    expect(plan.duplicateCodes).toEqual(['AP_X']);
  });

  // Deliberate: is_active is not in the managed field list, so an admin who
  // hides a course keeps it hidden across reseeds. Pinned so that adding
  // is_active to the payload has to be an explicit decision, not a side effect.
  it('leaves a deactivated course deactivated', () => {
    const existing = [{
      id: 'c1', code: 'AP_X', name: 'AP X', color: '#111', icon: 'X',
      description: 'd', order: 1, is_active: false,
    }];
    const plan = planCourseUpserts(catalog, existing);
    expect(plan.update).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });
});

describe('planUnitUpserts', () => {
  const courseIdByCode = new Map([['AP_X', 'c1']]);

  it('creates every missing unit with the course id as FK', () => {
    const plan = planUnitUpserts(catalog, [], courseIdByCode);
    expect(plan.create).toHaveLength(2);
    expect(plan.create[0]).toMatchObject({
      course_id: 'c1', course_code: 'AP_X', unit_number: 1,
      title: 'One', exam_weight_min: 10, exam_weight_max: 12, order: 1,
    });
  });

  it('matches existing units on course id + unit number', () => {
    const existing = [{
      id: 'u1', course_id: 'c1', course_code: 'AP_X', unit_number: 1,
      title: 'One', exam_weight_min: 10, exam_weight_max: 12, order: 1,
    }];
    const plan = planUnitUpserts(catalog, existing, courseIdByCode);
    expect(plan.create).toHaveLength(1);
    expect(plan.create[0].unit_number).toBe(2);
    expect(plan.unchanged).toBe(1);
  });

  it('also matches legacy units still keyed by course code', () => {
    const existing = [{
      id: 'u1', course_id: 'AP_X', unit_number: 1,
      title: 'One', exam_weight_min: 10, exam_weight_max: 12, order: 1,
    }];
    const plan = planUnitUpserts(catalog, existing, courseIdByCode);
    expect(plan.create).toHaveLength(1);
    expect(plan.update).toEqual([
      { id: 'u1', data: { course_id: 'c1', course_code: 'AP_X' } },
    ]);
  });

  it('skips courses whose id is unknown', () => {
    const plan = planUnitUpserts(catalog, [], new Map());
    expect(plan.create).toHaveLength(0);
    expect(plan.skippedCourses).toEqual(['AP_X']);
  });

  it('reports no duplicates for a clean database', () => {
    const existing = [{
      id: 'u1', course_id: 'c1', course_code: 'AP_X', unit_number: 1,
      title: 'One', exam_weight_min: 10, exam_weight_max: 12, order: 1,
    }];
    const plan = planUnitUpserts(catalog, existing, courseIdByCode);
    expect(plan.duplicateUnits).toEqual([]);
  });
});

// A duplicate unit row is silently un-updatable: only one row per key can be
// reached by the lookup, so the others drift forever unless the plan names them.
describe('planUnitUpserts duplicate detection', () => {
  const courseIdByCode = new Map([['AP_X', 'c1']]);
  const matching = {
    course_id: 'c1', course_code: 'AP_X', unit_number: 1,
    title: 'One', exam_weight_min: 10, exam_weight_max: 12, order: 1,
  };

  it('reports two rows that share a course id and unit number', () => {
    const existing = [{ id: 'u1', ...matching }, { id: 'u2', ...matching }];
    const plan = planUnitUpserts(catalog, existing, courseIdByCode);
    expect(plan.duplicateUnits).toEqual(['AP_X:1']);
    expect(plan.unchanged).toBe(1);
    expect(plan.create).toHaveLength(1);
    expect(plan.create[0].unit_number).toBe(2);
  });

  // The partially-migrated case: one row still keyed by the course code, one
  // already keyed by the course id. Different map keys, so indexing cannot see
  // the clash; only the two-key lookup can.
  it('reports a legacy code-keyed row alongside a migrated id-keyed row', () => {
    const existing = [
      {
        id: 'legacy', course_id: 'AP_X', unit_number: 1,
        title: 'One', exam_weight_min: 10, exam_weight_max: 12, order: 1,
      },
      { id: 'migrated', ...matching },
    ];
    const plan = planUnitUpserts(catalog, existing, courseIdByCode);
    expect(plan.duplicateUnits).toEqual(['AP_X:1']);
    expect(plan.update).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });

  it('names each duplicated unit once', () => {
    const existing = [{ id: 'u1', ...matching }, { id: 'u2', ...matching }, { id: 'u3', ...matching }];
    const plan = planUnitUpserts(catalog, existing, courseIdByCode);
    expect(plan.duplicateUnits).toEqual(['AP_X:1']);
  });

  it('labels a duplicate by course code even when the rows carry no course_code', () => {
    const existing = [
      { id: 'u1', course_id: 'AP_X', unit_number: 2, title: 'Two', exam_weight_min: 5, exam_weight_max: 5, order: 2 },
      { id: 'u2', course_id: 'AP_X', unit_number: 2, title: 'Two', exam_weight_min: 5, exam_weight_max: 5, order: 2 },
    ];
    const plan = planUnitUpserts(catalog, existing, courseIdByCode);
    expect(plan.duplicateUnits).toEqual(['AP_X:2']);
  });
});

// parseWeight('Not assessed') returns {}, so both weights are undefined. An
// undefined-valued key must never reach a payload: on a create it would send an
// explicit undefined, and on an update it would be a write that changes nothing
// and gets replanned on every run.
describe('planUnitUpserts with an unassessed unit', () => {
  const unassessed: CatalogCourse[] = [{
    code: 'AP_U', name: 'AP U', color: '#222', icon: 'U', description: 'd', order: 1,
    units: [{ number: 1, title: 'Only', weight: 'Not assessed', topics: ['t1'] }],
  }];
  const courseIdByCode = new Map([['AP_U', 'c1']]);

  it('creates the unit with no exam weight keys at all', () => {
    const plan = planUnitUpserts(unassessed, [], courseIdByCode);
    expect(plan.create).toHaveLength(1);
    expect(plan.create[0]).not.toHaveProperty('exam_weight_min');
    expect(plan.create[0]).not.toHaveProperty('exam_weight_max');
    expect(Object.keys(plan.create[0])).toEqual([
      'course_id', 'course_code', 'unit_number', 'title', 'order',
    ]);
  });

  it('treats a row that never had weights as unchanged', () => {
    const existing = [{
      id: 'u1', course_id: 'c1', course_code: 'AP_U', unit_number: 1, title: 'Only', order: 1,
    }];
    const plan = planUnitUpserts(unassessed, existing, courseIdByCode);
    expect(plan.update).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
    expect(plan.staleWeights).toEqual([]);
  });

  it('reports a stale weight instead of planning an empty write', () => {
    const existing = [{
      id: 'u1', course_id: 'c1', course_code: 'AP_U', unit_number: 1, title: 'Only', order: 1,
      exam_weight_min: 5, exam_weight_max: 9,
    }];
    const plan = planUnitUpserts(unassessed, existing, courseIdByCode);
    expect(plan.update).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
    expect(plan.staleWeights).toEqual(['AP_U:1']);
  });

  it('keeps the stale weight out of an update it makes for other reasons', () => {
    const existing = [{
      id: 'u1', course_id: 'c1', course_code: 'AP_U', unit_number: 1, title: 'Stale Title', order: 1,
      exam_weight_min: 5, exam_weight_max: 9,
    }];
    const plan = planUnitUpserts(unassessed, existing, courseIdByCode);
    expect(plan.update).toEqual([{ id: 'u1', data: { title: 'Only' } }]);
    expect(plan.staleWeights).toEqual(['AP_U:1']);
  });
});

describe('planUnitUpserts against the real catalog', () => {
  const courseIdByCode = new Map(CATALOG.map((course, i) => [course.code, `course${i + 1}`]));

  // AP_PRECALC unit 4 has weight 'Not assessed', so this fires on every seed of
  // the real catalog, not just on a contrived input.
  it('creates AP Precalculus unit 4 without undefined exam weights', () => {
    const plan = planUnitUpserts(CATALOG, [], courseIdByCode);
    const unit4 = plan.create.find(
      (row) => row.course_code === 'AP_PRECALC' && row.unit_number === 4,
    );
    expect(unit4).toBeDefined();
    expect(unit4).not.toHaveProperty('exam_weight_min');
    expect(unit4).not.toHaveProperty('exam_weight_max');
  });

  it('never emits a create payload holding an undefined value', () => {
    const plan = planUnitUpserts(CATALOG, [], courseIdByCode);
    expect(plan.create).toHaveLength(68);
    for (const row of plan.create) {
      for (const [field, value] of Object.entries(row)) {
        expect(value, `${String(row.course_code)} unit ${String(row.unit_number)}: ${field}`)
          .not.toBeUndefined();
      }
    }
  });

  it('is idempotent: replanning against the rows it just created is a no-op', () => {
    const first = planUnitUpserts(CATALOG, [], courseIdByCode);
    const second = planUnitUpserts(CATALOG, stored(first.create), courseIdByCode);
    expect(second.create).toHaveLength(0);
    expect(second.update).toHaveLength(0);
    expect(second.unchanged).toBe(68);
    expect(second.duplicateUnits).toEqual([]);
    expect(second.staleWeights).toEqual([]);
  });

  it('converges after one pass over a database still keyed by course code', () => {
    const legacy = stored(
      planUnitUpserts(CATALOG, [], courseIdByCode).create.map(({ course_code, ...rest }) => ({
        ...rest,
        course_id: course_code,
      })),
    );
    const first = planUnitUpserts(CATALOG, legacy, courseIdByCode);
    expect(first.create).toHaveLength(0);
    expect(first.update).toHaveLength(68);
    expect(first.duplicateUnits).toEqual([]);

    const migrated = legacy.map((row) => ({
      ...row,
      ...first.update.find((u) => u.id === row.id)?.data,
    }));
    const second = planUnitUpserts(CATALOG, migrated, courseIdByCode);
    expect(second.update).toHaveLength(0);
    expect(second.unchanged).toBe(68);
  });
});
