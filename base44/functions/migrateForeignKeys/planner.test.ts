import { describe, expect, it } from 'vitest';
import { planCourseIdUpdates, planUserIdUpdates } from './planner.ts';

const courses = {
  idSet: new Set(['c1']),
  idByCode: new Map([['AP_X', 'c1']]),
};

describe('planCourseIdUpdates', () => {
  it('rewrites a code into the course id', () => {
    const plan = planCourseIdUpdates([{ id: 'r1', course_id: 'AP_X', course_code: 'AP_X' }], courses);
    expect(plan.updates).toEqual([{ id: 'r1', course_id: 'c1' }]);
  });

  it('falls back to course_id when course_code is missing', () => {
    const plan = planCourseIdUpdates([{ id: 'r1', course_id: 'AP_X' }], courses);
    expect(plan.updates).toEqual([{ id: 'r1', course_id: 'c1' }]);
  });

  it('skips rows already holding a real id', () => {
    const plan = planCourseIdUpdates([{ id: 'r1', course_id: 'c1', course_code: 'AP_X' }], courses);
    expect(plan.updates).toHaveLength(0);
    expect(plan.alreadyMigrated).toBe(1);
  });

  it('reports rows whose code matches no course', () => {
    const plan = planCourseIdUpdates([{ id: 'r1', course_id: 'AP_GONE', course_code: 'AP_GONE' }], courses);
    expect(plan.updates).toHaveLength(0);
    expect(plan.unresolved).toEqual([{ id: 'r1', value: 'AP_GONE' }]);
  });

  it('reports rows with no course value at all', () => {
    const plan = planCourseIdUpdates([{ id: 'r1' }], courses);
    expect(plan.empty).toEqual(['r1']);
  });
});

const users = {
  idSet: new Set(['u1', 'u2']),
  idByEmail: new Map([['a@x.com', 'u1']]),
};

describe('planUserIdUpdates', () => {
  it('resolves by email', () => {
    const plan = planUserIdUpdates(
      [{ id: 'r1', student_id: 'a@x.com', student_email: 'a@x.com' }],
      users, 'student_id', 'student_email',
    );
    expect(plan.updates).toEqual([{ id: 'r1', student_id: 'u1' }]);
    expect(plan.resolvedVia).toEqual({ email: 1, created_by_id: 0 });
  });

  it('normalises case and whitespace before matching', () => {
    const plan = planUserIdUpdates(
      [{ id: 'r1', student_email: '  A@X.com ' }],
      users, 'student_id', 'student_email',
    );
    expect(plan.updates).toEqual([{ id: 'r1', student_id: 'u1' }]);
  });

  it('falls back to created_by_id when the email matches no user', () => {
    const plan = planUserIdUpdates(
      [{ id: 'r1', student_email: 'gone@x.com', created_by_id: 'u2' }],
      users, 'student_id', 'student_email',
    );
    expect(plan.updates).toEqual([{ id: 'r1', student_id: 'u2' }]);
    expect(plan.resolvedVia).toEqual({ email: 0, created_by_id: 1 });
  });

  it('flags a conflict when email and created_by_id disagree', () => {
    const plan = planUserIdUpdates(
      [{ id: 'r1', student_email: 'a@x.com', created_by_id: 'u2' }],
      users, 'student_id', 'student_email',
    );
    expect(plan.updates).toEqual([{ id: 'r1', student_id: 'u1' }]);
    expect(plan.conflicts).toEqual([
      { id: 'r1', byEmail: 'u1', byCreatedBy: 'u2' },
    ]);
  });

  it('skips rows already holding a real id', () => {
    const plan = planUserIdUpdates(
      [{ id: 'r1', student_id: 'u1', student_email: 'a@x.com' }],
      users, 'student_id', 'student_email',
    );
    expect(plan.alreadyMigrated).toBe(1);
    expect(plan.updates).toHaveLength(0);
  });

  it('reports rows that cannot be resolved at all', () => {
    const plan = planUserIdUpdates(
      [{ id: 'r1', student_email: 'gone@x.com' }],
      users, 'student_id', 'student_email',
    );
    expect(plan.unresolved).toEqual([{ id: 'r1', value: 'gone@x.com' }]);
  });

  it('leaves an absent optional tutor alone', () => {
    const plan = planUserIdUpdates([{ id: 'r1' }], users, 'tutor_id', 'tutor_email');
    expect(plan.updates).toHaveLength(0);
    expect(plan.empty).toEqual(['r1']);
  });
});
