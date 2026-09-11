import { describe, expect, it } from 'vitest';
import { CATALOG, type CatalogCourse, expandCatalog, parseWeight } from './catalog.ts';

describe('CATALOG', () => {
  it('has 10 courses with unique codes', () => {
    expect(CATALOG).toHaveLength(10);
    expect(new Set(CATALOG.map((c) => c.code)).size).toBe(10);
  });

  // These totals were measured from src/lib/courseData.js at port time. They are
  // pinned rather than derived so that content silently disappearing during a
  // later edit fails here instead of surfacing as missing lessons in the app.
  it('still contains every unit and topic that was ported', () => {
    const courses = expandCatalog();
    const units = courses.reduce((n, c) => n + c.units.length, 0);
    const topics = courses.reduce(
      (n, c) => n + c.units.reduce((m, u) => m + u.topics.length, 0),
      0,
    );
    expect(units).toBe(68);
    expect(topics).toBe(524);
  });

  it('keeps the corrected AP Calculus BC exam weights', () => {
    const bc = expandCatalog().find((c) => c.code === 'AP_CALC_BC');
    expect(bc?.units.map((u) => u.weight)).toEqual([
      '4-7%', '4-7%', '4-7%', '6-9%', '8-11%', '17-20%', '6-9%', '6-9%',
      '11-12%', '17-18%',
    ]);
  });

  it('preserves the source unit numbering, which does not start at 1 everywhere', () => {
    const byCode = new Map(expandCatalog().map((c) => [c.code, c.units.map((u) => u.number)]));
    expect(byCode.get('AP_PHYSICS_2')?.[0]).toBe(9);
    expect(byCode.get('AP_PHYSICS_CE')?.[0]).toBe(8);
    expect(byCode.get('AP_CALC_BC')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('gives every course at least one unit after expansion', () => {
    for (const course of expandCatalog()) {
      expect(course.units.length, `${course.code} has no units`).toBeGreaterThan(0);
    }
  });

  it('gives every unit at least one topic', () => {
    for (const course of expandCatalog()) {
      for (const unit of course.units) {
        expect(unit.topics.length, `${course.code} unit ${unit.number}`).toBeGreaterThan(0);
      }
    }
  });

  it('has unique unit numbers within each course', () => {
    for (const course of expandCatalog()) {
      const numbers = course.units.map((u) => u.number);
      expect(new Set(numbers).size, `${course.code} has duplicate unit numbers`).toBe(numbers.length);
    }
  });
});

// No course in CATALOG uses `extends`, so without these the inheritance branch
// would ship with zero coverage and Task 1.4 would be the first thing to run it.
describe('expandCatalog inheritance', () => {
  const parent: CatalogCourse = {
    code: 'PARENT',
    name: 'Parent',
    color: '#000000',
    icon: 'PA',
    description: 'parent course',
    order: 1,
    units: [{ number: 1, title: 'Shared', weight: '10%', topics: ['alpha'] }],
  };
  const child: CatalogCourse = {
    code: 'CHILD',
    name: 'Child',
    color: '#111111',
    icon: 'CH',
    description: 'child course',
    order: 2,
    extends: 'PARENT',
    extraUnits: [{ number: 2, title: 'Extra', weight: '20%', topics: ['beta'] }],
  };

  it('puts inherited units before the extra ones', () => {
    const expanded = expandCatalog([parent, child]).find((c) => c.code === 'CHILD');
    expect(expanded?.units.map((u) => u.title)).toEqual(['Shared', 'Extra']);
  });

  it('copies inherited units instead of aliasing the parent', () => {
    const expanded = expandCatalog([parent, child]);
    const inherited = expanded.find((c) => c.code === 'CHILD')!.units[0];
    inherited.title = 'Mutated';
    inherited.topics.push('injected');

    expect(parent.units![0].title).toBe('Shared');
    expect(parent.units![0].topics).toEqual(['alpha']);
  });

  it('drops extends and extraUnits so they cannot leak into a create payload', () => {
    const expanded = expandCatalog([parent, child]).find((c) => c.code === 'CHILD');
    expect(expanded).not.toHaveProperty('extends');
    expect(expanded).not.toHaveProperty('extraUnits');
  });
});

describe('parseWeight', () => {
  it('parses a range', () => expect(parseWeight('10-12%')).toEqual({ min: 10, max: 12 }));
  it('parses a single value', () => expect(parseWeight('17%')).toEqual({ min: 17, max: 17 }));
  it('returns empty for unassessed', () => expect(parseWeight('Not assessed')).toEqual({}));
});
