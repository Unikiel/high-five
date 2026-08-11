# ID-Based Entity Connections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every name-based foreign key in High Five (emails standing in for user ids, course codes standing in for course ids) with real Base44 record ids, without losing any production data.

**Architecture:** Expand-contract migration in four independently shippable milestones. We add a transitional "honest name" field beside each lying field (`student_email` beside `student_id`, `course_code` beside `course_id`), move all reads onto the transitional field, then overwrite the `*_id` field with real record ids, then move reads onto the now-truthful `*_id` field, then drop the transitional field. Every step is reversible and every backfill is idempotent and resumable. All pure decision logic lives in importable `planner.ts` modules so it is unit-testable without a database.

**Tech Stack:** React 18 + Vite, Base44 SDK 0.8.41 (`@base44/sdk`), Base44 backend functions (Deno + `npm:@base44/sdk@0.8.25`), TanStack Query, Vitest (added by this plan).

---

## Progress log

| Task | Status | Commits |
|---|---|---|
| 0.1 Add Vitest | Done | `9ad26c3`, `4178237` |
| 0.2 Migration audit function | Code done, **not yet run** | `704d161`, `ffbdda4`, `958e147` |
| 0.3 Snapshot backup function | Code done, **not yet run** | `bb4aad6`, `958e147` |
| 1.1 – 1.6 | Not started | — |

**Nothing has touched the production database yet.** Tasks 0.2 and 0.3 only add code; their deploy-and-invoke steps are deliberately deferred to a single batched session (see "Database-run checklist" at the bottom of this document) so that all read-only measurement happens at one consistent point in time.

Two corrections were made after Task 0.2 was first written, both worth knowing because they invalidate any audit output captured before commit `ffbdda4`:

1. **`listAll` advanced `skip` by a constant page size.** If the platform ever returns fewer rows than requested, that skipped the unreturned rows and silently under-reported every count. It now advances by the number of rows actually returned and terminates on an empty page. This same helper is duplicated in Tasks 0.3, 1.4, 1.5, 2.x and the frontend `fetchAll` in Task 1.6 — all copies in this document already carry the fix, and the bug is much more dangerous in the backfill tasks, where an undercount means silently skipping rows during a *write*.
2. **The identity metrics were uninterpretable.** `created_by_id` counters were summed across four tables into one scalar, and `payments_without_user_link` counted a field (`Payment.user_id`) that Task 2.1 has not yet created, so it could only ever report 100%. Both are fixed; see Task 0.2 Step 4 for how to read the replacements.

## Known defect to fix before Milestone 2 runs

**`Question.course_id` will never be migrated as the plan currently stands.** Task 1.4 adds a `course_code` field to `Question` and Task 4.1 unsets it, but **no task ever writes it**. `planCourseIdUpdates` resolves the new `course_id` from `course_code`, so for every `Question` row it finds nothing and falls through to its `|| current` branch, leaving the course code in place. Task 4.4's verification expects `course_id_shape.Question` to report `id` equal to the row count, so this surfaces as a confusing failure at the very last step of the migration.

Fix it when Milestone 2 is planned in detail, by either including `Question` in Task 2.3's `backfillLegacyNames` alongside the other tables, or by resolving `Question.course_id` through its already-correct `topic_id`/`unit_id` chain instead of through a code. The second is more robust, since `Question.unit_id` is one of the three fields that were never broken.

This was found while reviewing Task 0.3 and is recorded here rather than fixed now, because Milestone 2 is out of scope for the current session.

## Context an engineer needs before starting

You have zero context on this codebase. Read this section fully.

### What is broken

Base44 gives every record a server-generated `id`, and `base44.auth.me()` returns a `User` with a stable `id`. The app ignores both. Instead:

| Field | Declared as | Actually holds | Consequence |
|---|---|---|---|
| `Enrollment.student_id` | string | the user's **email** | user changes email → loses all enrollments |
| `Progress.student_id` | string | the user's **email** | user changes email → loses all progress |
| `Exam.student_id` | string | the user's **email** | user changes email → loses exam history |
| `TutoringSession.student_id` | string | the user's **email** | same |
| `TutoringSession.tutor_id` | string | an **email**, or the literal string `"pending"` | same, plus a sentinel value in a FK column |
| `Enrollment.course_id` | string | a **course code** like `AP_CALC_AB` | admin renames a code → orphans every child row |
| `Progress.course_id` | string | a course code | same |
| `Exam.course_id` | string | a course code | same |
| `Question.course_id` | string | a course code | same |
| `Topic.course_id` | string | a course code | same |
| `Unit.course_id` | string | a course code | same |
| `Payment.email` | string | an **unverified** email from a request body | payment can be attached to an address the payer does not own |

Three fields are already correct and must not be touched: `Topic.unit_id` (holds `Unit.id`), `Question.topic_id` (holds `Topic.id`), `Question.unit_id` (holds `Unit.id`).

`base44/functions/seedCourseContent/entry.ts:42-54` shows the inconsistency inside a single object literal — `unit_id: unitRecord.id` (a real id) sits directly above `course_id: course.code` (a code string).

### Two blocking discoveries that reorder the work

**1. Nothing in the repository ever creates a `Unit` record.** A whole-repo search for `Unit.create` and `Unit.bulkCreate` returns zero matches. Yet `seedCourseContent/entry.ts:83-84` does:

```ts
const unitRecord = unitMap.get(`${course.code}:${unitNumber}`);
if (!unitRecord) continue;
```

If the `Unit` table is empty, this silently creates **zero** topics and still returns HTTP 200 with `{ topics_created: 0 }`. The content pipeline is very likely dead. Milestone 1 fixes this and must run before any foreign-key migration, because `course_id` cannot point at `Course.id` until a `Course` row exists for every code.

**2. There are two competing course catalogs, and the student-facing app uses the one that is not in the database.**

- `src/lib/courseData.js` exports a hardcoded `COURSES` array of 10 courses (the only identifier is `code`; there is no `id`). Every student page and 4 admin pages read this.
- The `Course` database table is written **only** by `src/pages/admin/AdminCourses.jsx`. No student-facing page reads it.
- `base44/functions/seedCourseContent/entry.ts:3-26` contains a **third** copy of the catalog, inlined, in a different shape.
- `enrichCourseContent/entry.ts:6-17` and `generateQuestionBank/entry.ts:6-17` each contain a **fourth and fifth** partial copy as a `COURSE_NAMES` map.

Milestone 1 makes the database the single source of truth. Milestone 3 deletes the static copies.

### Base44 SDK facts you will rely on

Verified in `node_modules/@base44/sdk/dist/modules/`:

- `auth.types.d.ts:6` — `User.id: string` is returned by `base44.auth.me()`.
- `entities.types.d.ts:158-171` — **every** record automatically carries server-populated `created_by` (creator's email) and `created_by_id` (creator's user id). This is our independent cross-check during the student backfill.
- `list(sort, limit, skip, fields)` and `filter(query, sort, limit, skip, fields)` — **maximum limit is 5,000 per request**. Paginate with `skip`.
- `bulkUpdate(data)` — up to **500** records per request, each with its own fields. This is the backfill workhorse.
- `updateMany(query, { $set | $unset | $rename | ... })` — batches of 500, returns `has_more`; loop until `has_more` is false. The query **must** exclude already-updated rows or you will loop forever.
- `filter` supports `$in`, `$nin`, `$exists`, `$ne`, `$regex`, `$or`.

There are **no transactions and no rollback**. That is why Milestone 0 takes a full JSON snapshot before anything mutates.

### Why `created_by_id` is trustworthy here

The inventory proved that **no admin page and no backend function ever writes `student_id`** (zero occurrences of `student_id` across all 9 files in `base44/functions/`, and all 8 admin pages write nothing to it). Every row carrying a `student_id` was therefore created by the student themselves, in their own browser session, so `created_by_id` on that row is that student's real user id. We still resolve by email first (it is the semantically intended link) and use `created_by_id` as a fallback plus a disagreement detector.

### Conventions

- Path alias `@/` maps to `src/` (see `jsconfig.json`).
- Frontend imports the client as `import { base44 } from "@/api/base44Client";`.
- Backend functions are Deno; they import `createClientFromRequest` from `npm:@base44/sdk@0.8.25` and use `base44.asServiceRole.entities.X` for privileged access.
- Admin-gated functions follow the pattern at `seedCourseContent/entry.ts:70-73`.
- Long-running functions also accept an automation token, pattern at `enrichCourseContent/entry.ts:24-28`.
- Entity schemas are `base44/entities/<Name>.jsonc`. Adding a property there adds the field.
- Commit after every task. Never batch two tasks into one commit.
- **`npm run lint` already fails on a clean checkout** — 48 pre-existing `unused-imports/no-unused-imports` errors across 17 files this plan does not touch. So a whole-repo lint is useless as a gate. Wherever this plan says to lint, run ESLint **scoped to the files you changed**, e.g. `npx eslint src/pages/Courses.jsx src/pages/Practice.jsx`, and require a clean exit for those files only. Do not fix the unrelated 48; that is separate work.
- If a command fails with `Cannot find module '<something>'` for a package that is clearly in `package-lock.json`, re-run a bare `npm install`. Something on this machine (antivirus or a sync client) intermittently deletes files out of `node_modules` mid-extraction. This is an environment problem, not a dependency problem.

### Target end state

| Field | Holds | Notes |
|---|---|---|
| `Enrollment/Progress/Exam/TutoringSession.student_id` | `User.id` | |
| `TutoringSession.tutor_id` | `User.id` or absent | becomes optional; `status` carries "unassigned", the `"pending"` sentinel is gone |
| `Enrollment/Progress/Exam/Unit/Topic/Question.course_id` | `Course.id` | |
| `Topic.unit_id`, `Question.unit_id`, `Question.topic_id` | unchanged | already correct |
| `Payment.user_id` | `User.id` | new field, set from the authenticated session |
| `Course.code` | the business key | unique, immutable after creation, used only for URLs and seeding |

URLs keep the readable code (`/courses/AP_CALC_AB`); the page resolves code → `Course.id` through a cached registry. No bookmarks break and no UUIDs appear in the address bar.

Transitional fields `course_code`, `student_email`, `tutor_email` exist only during the migration and are removed in Milestone 4.

### File structure this plan creates

| File | Responsibility |
|---|---|
| `vitest.config.js` | test runner config, `@` alias |
| `base44/functions/migrationAudit/entry.ts` | read-only: classify every FK value, count orphans |
| `base44/functions/exportSnapshot/entry.ts` | read-only: dump all affected rows as JSON (the backup) |
| `base44/functions/seedCatalog/catalog.ts` | the single canonical static catalog (courses + units + topics) |
| `base44/functions/seedCatalog/planner.ts` | pure: diff catalog against DB → Course/Unit upserts |
| `base44/functions/seedCatalog/planner.test.ts` | unit tests for the above |
| `base44/functions/seedCatalog/entry.ts` | I/O: apply the plan idempotently |
| `base44/functions/backfillLegacyNames/entry.ts` | copy `course_id`→`course_code`, `student_id`→`student_email` |
| `base44/functions/migrateForeignKeys/planner.ts` | pure: decide each row's new `course_id`/`student_id`/`tutor_id` |
| `base44/functions/migrateForeignKeys/planner.test.ts` | unit tests for the above |
| `base44/functions/migrateForeignKeys/entry.ts` | I/O: dry-run + apply, resumable |
| `base44/functions/dropLegacyFields/entry.ts` | `$unset` transitional fields |
| `src/lib/courseRegistry.js` | frontend cached code↔id↔Course registry |
| `src/lib/courseRegistry.test.js` | unit tests for the above |
| `src/lib/fetchAll.js` | paginating table read (Base44's `list()` defaults to 50 rows) |
| `src/lib/legacyFields.js` | **temporary**: transitional field accessors, deleted in Milestone 4 |
| `src/lib/noNameKeys.test.js` | regression guard: fails if a name-based FK reappears |

Deleted by this plan: `src/lib/courseData.js` (Task 3.5) and `src/lib/legacyFields.js` (Task 4.1).

---

# Milestone 0 — Measure and back up

**Ships:** read-only tooling. No behavior change, no data change. **Do not skip.** You are about to mutate a production database that has no rollback.

## Task 0.1: Add Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/lib/authRedirect.test.js`

The harness is proved with a real test of an existing pure function rather than a placeholder, so the suite is green from the first commit. A permanently-red test would mask genuine failures for the rest of the migration.

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest@^3.0.0
```

- [ ] **Step 2: Create the config**

Create `vitest.config.js`:

```js
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Keep in sync with the "@/*" path mapping in jsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Every module under test is pure, so jsdom is unnecessary. A future
    // component test needs jsdom and @vitejs/plugin-react added first.
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}", "base44/**/*.{test,spec}.ts"],
  },
});
```

Two details here are load-bearing. The `include` globs deliberately cover `{test,spec}` and all four extensions: a narrower glob would let a misplaced test file be **silently skipped** while `npm test` still reported green, which is the worst possible failure mode when these tests are the only safety net before an irreversible data migration. And `base44/**/*.{test,spec}.ts` is what lets Vitest import the pure `planner.ts` modules that later tasks add — without it, none of the migration logic is tested.

A deliberately separate `vitest.config.js` (rather than folding `test` into `vite.config.js`) means Vitest ignores `vite.config.js` entirely, so `@base44/vite-plugin` never loads into the test process. That keeps the test module graph clean and fast.

- [ ] **Step 3: Add the test script**

In `package.json`, add to `"scripts"` after `"lint:fix"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 4: Write the first test against an existing pure function**

`resolvePostAuthPath` in `src/lib/authRedirect.js` is pure and dependency-free, so it exercises the runner and the `@` alias without needing any new production code.

Create `src/lib/authRedirect.test.js`:

```js
import { describe, expect, it } from "vitest";
import { AUTHED_HOME, resolvePostAuthPath } from "@/lib/authRedirect";

describe("resolvePostAuthPath", () => {
  it("returns the authed home when there is no origin", () => {
    expect(resolvePostAuthPath({})).toBe(AUTHED_HOME);
    expect(resolvePostAuthPath(null)).toBe(AUTHED_HOME);
  });

  it("returns the requested path with its search and hash", () => {
    const location = { state: { from: { pathname: "/courses", search: "?q=1", hash: "#top" } } };
    expect(resolvePostAuthPath(location)).toBe("/courses?q=1#top");
  });

  it("omits search and hash when they are absent", () => {
    expect(resolvePostAuthPath({ state: { from: { pathname: "/courses" } } })).toBe("/courses");
  });

  it("never bounces back to an auth route", () => {
    for (const pathname of ["/login", "/register", "/forgot-password", "/reset-password"]) {
      expect(resolvePostAuthPath({ state: { from: { pathname } } })).toBe(AUTHED_HOME);
    }
  });

  it("sends the site root to the authed home", () => {
    expect(resolvePostAuthPath({ state: { from: { pathname: "/" } } })).toBe(AUTHED_HOME);
  });

  it("rejects protocol-relative and non-absolute paths", () => {
    expect(resolvePostAuthPath({ state: { from: { pathname: "//evil.com" } } })).toBe(AUTHED_HOME);
    expect(resolvePostAuthPath({ state: { from: { pathname: "evil.com" } } })).toBe(AUTHED_HOME);
  });
});
```

The root path gets its own test rather than joining the auth-route loop because `/` is **not** in `AUTH_ROUTES` — it is caught by a different condition, so the two branches can regress independently and a failure should say which one did. The "omits search and hash" test pins the `search = ""` / `hash = ""` parameter defaults; without it, deleting those defaults yields `/coursesundefinedundefined` with a fully green suite.

- [ ] **Step 5: Run it and confirm the suite is green**

```bash
npm test
```

Expected: PASS, 6 tests. This proves the runner, the `@` alias, and the assertion library all work. If the protocol-relative case fails, that is a genuine open-redirect bug in `authRedirect.js` — report it rather than weakening the test.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/lib/authRedirect.test.js
git commit -m "test: add vitest harness and cover post-auth redirect resolution"
```

## Task 0.2: Read-only migration audit function

This tells you the true scale and, critically, how many rows can **never** be resolved. Do not plan the backfill on guesses.

**Files:**
- Create: `base44/functions/migrationAudit/entry.ts`

- [ ] **Step 1: Write the function**

Create `base44/functions/migrationAudit/entry.ts`:

```ts
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE = 5000;
const MAX_REQUESTS = 1000;

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
```

- [ ] **Step 2: Deploy and invoke it**

Push so the platform deploys the function, then run this from the browser console of the running app while logged in as an admin:

```js
await (await import("/src/api/base44Client.js")).base44.functions.invoke("migrationAudit", {})
```

- [ ] **Step 3: Record the output in this plan file**

Paste the full JSON into a new section at the bottom of this document titled `## Audit baseline (recorded <date>)`. Every later verification step compares against these numbers.

- [ ] **Step 4: Stop and read four fields before continuing**

- `blockers.units_table_empty` — if `true`, Milestone 1 is mandatory and the content pipeline is confirmed dead.
- `blockers.duplicate_course_codes` — must be `[]` before Milestone 2. If not empty, resolve duplicates by hand in the admin UI first.
- `orphans.emails_with_no_user` — these rows cannot be resolved by email. They will fall back to `created_by_id`. Any that still fail must be dealt with by hand in Task 2.6.
- `created_by_id` — reported per table as `{ rows, missing, qualifying, disagrees }`. **Read `qualifying` before you read `disagrees`.** `qualifying` is the number of rows where the check could actually run (the `student_id` is an email that matches a real user), so it is the denominator. `disagrees: 0` with a healthy `qualifying` is the green light: `created_by_id` is a trustworthy fallback for Task 2.6. `disagrees: 0` with `qualifying: 0` proves nothing at all and means the fallback is unverified — say so before running the backfill. Any non-zero `disagrees` means some rows were created on another user's behalf; inspect them by hand, because the planner trusts the email over `created_by_id`.

Note on `payments`: `without_user_id` will read 100% of `total` at this stage, because the `user_id` field does not exist until Task 2.1 adds it. That is expected, not a finding. The number that carries information today is `emails_matching_no_user` — payment emails with no matching `User` row, which are the ones Task 4.2 will not be able to link automatically.

- [ ] **Step 5: Commit**

```bash
git add base44/functions/migrationAudit/entry.ts
git commit -m "feat: add read-only migration audit function"
```

## Task 0.3: Snapshot backup function

Base44 has no transactions and no point-in-time restore. This JSON file is your only way back from Task 2.6.

Because it is the only way back, it must actually come back. A naive "export every field of every row" returns the entire database in a single HTTP response from a single Deno isolate, and `Topic` alone carries `lesson_content`, `cheatsheet`, `worked_examples` and `latex_formulas` — large prose blobs that can dominate the payload. If that response dies or is truncated, you learn about it at the worst possible moment.

So the default mode exports **only the fields this migration ever writes**, which is all a rollback needs and a small fraction of the bytes:

- Every rollback in this plan restores foreign keys with a `bulkUpdate` keyed on record `id`. It never recreates a row from scratch.
- The migration never writes `lesson_content` or any other prose field, so those fields cannot be damaged by it.
- Topic and question content is regenerable from the canonical catalog by Task 1.5's seeder.

A `mode: 'full'` escape hatch exports everything for archival purposes, and may legitimately fail on a large database. The response states which mode produced it so the file is self-describing.

**Files:**
- Create: `base44/functions/exportSnapshot/entry.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Write the function**

Create `base44/functions/exportSnapshot/entry.ts`:

```ts
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
// This is not only the foreign keys: Task 1.4's seeder also diffs and overwrites
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
    // this file is the only way back from Task 2.6.
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
```

- [ ] **Step 2: Take the snapshot and save it to disk**

Take it when nobody else is using the app. The tables are read one after another, so a write that lands mid-export produces a snapshot where one table is newer than another — `taken_at` records when the export started, not a consistent database-wide instant.

From the admin browser console:

```js
const res = await (await import("/src/api/base44Client.js")).base44.functions.invoke("exportSnapshot", {});
const snap = res.data ?? res;
console.log(snap.mode, snap.counts);
const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
const a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = `high-five-snapshot-${snap.mode}-${new Date().toISOString().slice(0, 10)}.json`;
a.click();
```

If that call fails or returns nothing, the database is too large for one response. Pull it in pieces — the files together are as good as one file:

```js
for (const name of ["Course", "Unit", "Topic", "Question", "Enrollment", "Progress", "Exam", "TutoringSession", "Payment", "User"]) {
  const res = await (await import("/src/api/base44Client.js")).base44.functions.invoke("exportSnapshot", { entities: [name] });
  const snap = res.data ?? res;
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `high-five-snapshot-${name}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  await new Promise((r) => setTimeout(r, 500));
}
```

- [ ] **Step 3: Verify the file**

Three checks, in order:

1. **Counts match the audit.** Every entry in `counts` equals the same entry in the Task 0.2 audit `counts`. A mismatch means either a write landed mid-export or pagination lost rows — re-run before trusting it.
2. **The file parses.** Re-open the saved file and confirm it is valid JSON. A response truncated in transit would already have thrown a parse error inside `invoke`, so the risk here is a bad file write rather than a bad response; either way, a file that will not parse is not a backup.
3. **Spot-check one row.** Open the file and confirm an `Enrollment` row has a real `id` and a populated `student_id`. If `student_id` is empty across the board, the export picked the wrong fields and the rollback path is worthless. If you are re-taking this snapshot later in the migration (Task 2.6 Step 3 asks you to), check that `student_email` and `course_code` are populated too — after Task 2.3 those are the fields that let you rebuild without the file at all, so a snapshot missing them is far less useful than it looks.

Store the file outside the repository — it contains user emails, so it must never be committed. `.gitignore` already ignores `high-five-snapshot-*.json`; the entry was added ahead of this task so the guard exists before the first snapshot does.

- [ ] **Step 4: Commit**

```bash
git add base44/functions/exportSnapshot/entry.ts .gitignore
git commit -m "feat: add snapshot export for migration rollback"
```

---

# Milestone 1 — Make the catalog real

**Ships:** a populated `Course` and `Unit` table and a working, idempotent content pipeline. Independently valuable even if you stop here — it repairs the dead topic seeder. **Required** before Milestone 2, because `course_id` cannot reference `Course.id` until every code has exactly one `Course` row.

## Task 1.1: Make `Course.code` immutable and unique

Today `AdminCourses.jsx:151` lets an admin retype any course's `code` with no duplicate check, and `:52` saves it. Once codes become the seed/URL key this is a foot-gun.

Two details about the real file that the code below depends on: the loader is named `loadCourses`, and there is no `closeForm` helper — the component closes the modal inline with `setShowForm(false)` and `setEditingCourse(null)`.

**Files:**
- Modify: `src/pages/admin/AdminCourses.jsx:48-60` (the `save` handler), `:149-152` (the code input)

- [ ] **Step 1: Add a duplicate guard and freeze the code on edit**

Replace the `save` function (currently at lines 48-60) with:

```jsx
  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    const code = form.code.trim().toUpperCase();
    setCodeError("");
    setSaving(true);
    try {
      if (editingCourse) {
        // The code is the stable business key linking every unit, topic and
        // enrollment, so it is never rewritten on an existing course. Because it
        // cannot change here, there is nothing to check for duplicates.
        const { name, description, color, icon, exam_date, is_active } = form;
        await base44.entities.Course.update(editingCourse.id, {
          name, description, color, icon, exam_date, is_active,
        });
      } else {
        // Asked of the server rather than the `courses` array: list() returns only
        // the first 50 rows until Task 1.6 lands, so an in-memory check would
        // quietly stop catching clashes once the catalog outgrows one page.
        const clash = await base44.entities.Course.filter({ code });
        if (clash.length > 0) {
          setCodeError(`Code ${code} is already used by "${clash[0].name}".`);
          return;
        }
        await base44.entities.Course.create({ ...form, code });
      }
      await loadCourses();
      setShowForm(false);
      setEditingCourse(null);
    } finally {
      setSaving(false);
    }
  };
```

This is best-effort, not a guarantee: Base44 has no unique index, so two admins creating the same code simultaneously can still both succeed. `migrationAudit` reports duplicates, which is the backstop.

- [ ] **Step 2: Add the error state and clear it when the form opens**

Beside the other `useState` declarations near the top of the component, add:

```jsx
  const [codeError, setCodeError] = useState("");
```

Then add `setCodeError("");` to both `openAdd` and `openEdit`, so a failed save does not leave a stale error sitting on the next course the admin opens.

- [ ] **Step 3: Disable the input when editing and surface the error**

Replace the code `<Input>` (currently line 151) with:

```jsx
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. AP_CALC_AB"
                disabled={!!editingCourse}
              />
              {editingCourse && (
                <p className="text-xs text-muted-foreground mt-1">
                  Course code is permanent — it links every unit, topic, and enrollment.
                </p>
              )}
              {codeError && <p className="text-xs text-destructive mt-1">{codeError}</p>}
```

- [ ] **Step 4: Verify by hand**

```bash
npm run dev
```

Go to `/admin/courses`. Create a course with code `TEST_DUP`, then try to create a second one with the same code — the inline error must appear and nothing must be created. Open the first for editing — the code field must be greyed out. Delete `TEST_DUP` afterwards.

- [ ] **Step 5: Lint and commit**

```bash
npx eslint src/pages/admin/AdminCourses.jsx
git add src/pages/admin/AdminCourses.jsx
git commit -m "fix: make course code unique and immutable after creation"
```

## Task 1.2: Canonical catalog module

One copy of the static catalog, owned by the seeder. It is seed data, not runtime data.

**Files:**
- Create: `base44/functions/seedCatalog/catalog.ts`
- Create: `base44/functions/seedCatalog/catalog.test.ts`

- [ ] **Step 1: Create the module**

Create `base44/functions/seedCatalog/catalog.ts`. **Port from `src/lib/courseData.js`, not from the backend copy.**

The two rival catalogs were diffed programmatically before this task was written. They agree exactly — same 10 codes in the same order, same names, colors, icons and descriptions, same 68 units with the same titles, and the same 524 topic strings — and differ in exactly one respect: `courseData.js:151-162` overrides seven `AP_CALC_BC` unit weights (`4-7%`, `4-7%`, `4-7%`, `6-9%`, `8-11%`, `6-9%`, `6-9%` for units 1-5, 7 and 8) which the backend copy leaves at the inherited AB values. The frontend values are the correct AP ones.

That makes `courseData.js` the better source twice over: it is already the correct data, and it is already in the named-field unit shape (`{ number, title, weight, topics }`) that this module wants, so no tuple conversion is needed.

**Generate the port rather than retyping it.** 524 topic strings cannot be hand-copied reliably. Write a throwaway Node script that imports `courseData.js`, serializes `COURSES` to the `catalog.ts` source text, then delete the script. Then verify the result by diffing the generated `CATALOG` back against `courseData.js` for deep equality. Manual transcription of this volume is how silent content corruption gets introduced.

The shape is:

```ts
export interface CatalogUnit {
  number: number;
  title: string;
  weight: string;
  topics: string[];
}

export interface CatalogCourse {
  code: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  order: number;
  units?: CatalogUnit[];
  /** Inherit all units of another course by code, before this course's own units. */
  extends?: string;
  /** Units appended after inherited + own units. */
  extraUnits?: CatalogUnit[];
}

export const CATALOG: CatalogCourse[] = [
  {
    code: 'AP_CALC_AB',
    name: 'AP Calculus AB',
    color: '#2563EB',
    icon: 'AB',
    description:
      'Limits, derivatives, integrals, differential equations, and applications of calculus.',
    order: 1,
    units: [
      {
        number: 1,
        title: 'Limits and Continuity',
        weight: '10-12%',
        topics: [
          'Introducing Calculus: Can Change Occur at an Instant?',
          'Defining Limits and Using Limit Notation',
          // ...every topic string, generated from courseData.js
        ],
      },
      // ...units 2-8, generated from courseData.js
    ],
  },
  // ...the remaining 9 courses, generated from courseData.js
];

/**
 * Resolves `extends` / `extraUnits` into a flat unit list per course.
 *
 * Units are copied rather than aliased, because a caller that annotates an
 * expanded unit — attaching a created Unit id, say — would otherwise reach
 * through the shared reference and mutate the parent course's unit too.
 *
 * `extends` and `extraUnits` are dropped from the result so that a caller
 * building a Base44 create payload cannot accidentally forward them as stray
 * fields.
 */
export function expandCatalog(
  catalog: CatalogCourse[] = CATALOG,
): Array<Omit<CatalogCourse, 'extends' | 'extraUnits'> & { units: CatalogUnit[] }> {
  const byCode = new Map(catalog.map((c) => [c.code, c]));
  return catalog.map((course) => {
    const inherited = course.extends ? (byCode.get(course.extends)?.units ?? []) : [];
    const { extends: _inheritsFrom, extraUnits, units, ...rest } = course;
    return {
      ...rest,
      units: [...inherited, ...(units ?? []), ...(extraUnits ?? [])].map((unit) => ({
        ...unit,
        topics: [...unit.topics],
      })),
    };
  });
}

/** '10-12%' -> { min: 10, max: 12 }; '17%' -> { min: 17, max: 17 }; 'Not assessed' -> {} */
export function parseWeight(weight: string): { min?: number; max?: number } {
  const matches = String(weight).match(/\d+(?:\.\d+)?/g) ?? [];
  if (matches.length === 0) return {};
  const min = Number(matches[0]);
  return { min, max: matches[1] ? Number(matches[1]) : min };
}
```

**Porting rules — follow exactly:**
- Every course gets explicit `units`, including `AP_CALC_BC`, because `courseData.js` has already resolved BC's inheritance into a flat list with corrected weights. No course uses `extends` or `extraUnits` as a result. Those two fields and `expandCatalog` are kept anyway: later tasks call `expandCatalog` as their accessor, and keeping the seam means adding an inheriting course later does not require touching the seeder.
- Assign `order` 1-10 following the array order in `courseData.js`: `AP_CALC_AB`, `AP_CALC_BC`, `AP_PHYSICS_1`, `AP_PHYSICS_2`, `AP_PHYSICS_CM`, `AP_PHYSICS_CE`, `AP_CSP`, `AP_CSA`, `AP_STATS`, `AP_PRECALC`. This is the only field not present in the source, so it is the only one typed by hand.
- Do not include `exam_date`; admins set it per year in the UI.
- Unit numbers are deliberately **not** contiguous from 1 across all courses. `AP_PHYSICS_2` starts at unit 9, `AP_PHYSICS_CE` starts at unit 8, and `AP_CALC_BC` runs 1-10. Preserve the source numbers exactly; do not renumber.
- `AP_PRECALC` unit 4 has weight `'Not assessed'`, which `parseWeight` maps to `{}`. Keep the string as-is.

- [ ] **Step 2: Write a test that pins the catalog shape**

Create `base44/functions/seedCatalog/catalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CATALOG, expandCatalog, parseWeight } from './catalog.ts';

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
```

Note the import line needs the type as well: `import { CATALOG, type CatalogCourse, expandCatalog, parseWeight } from './catalog.ts';`

- [ ] **Step 3: Verify the port against its source, once**

The pinned totals above catch later drift but would not catch a mistake made during the port itself, because they were measured from the same run that produced the file. So before committing, prove the generated catalog equals `courseData.js` field for field with a throwaway script: for each course compare `code`, `name`, `color`, `icon` and `description`, and for each unit compare `number`, `title`, `weight` and the full `topics` array. It must report zero differences.

This check is deliberately **not** kept as a permanent test. `courseData.js` is deleted in Task 3.5, and a committed test importing it would have to be deleted at exactly that moment — the pinned totals are the durable guard instead. Delete the script once it reports clean.

- [ ] **Step 4: Run the tests**

```bash
npm test -- base44/functions/seedCatalog
```

Expected: all 13 assertions PASS (7 on `CATALOG`, 3 on inheritance, 3 on `parseWeight`). The pinned 68-unit / 524-topic totals and the `AP_CALC_BC` weight list are the checks that catch a botched port.

- [ ] **Step 5: Commit**

```bash
git add base44/functions/seedCatalog/catalog.ts base44/functions/seedCatalog/catalog.test.ts
git commit -m "feat: add canonical seed catalog ported from the frontend course data"
```

## Task 1.3: Seed planner (pure, tested)

**Files:**
- Create: `base44/functions/seedCatalog/planner.ts`
- Create: `base44/functions/seedCatalog/planner.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `base44/functions/seedCatalog/planner.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
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
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm test -- base44/functions/seedCatalog/planner
```

Expected: FAIL — `Failed to resolve import "./planner.ts"`.

- [ ] **Step 3: Implement the planner**

Create `base44/functions/seedCatalog/planner.ts`:

```ts
import { type CatalogCourse, type CatalogUnit, expandCatalog, parseWeight } from './catalog.ts';

export interface CoursePlan {
  create: Array<Record<string, unknown>>;
  update: Array<{ id: string; data: Record<string, unknown> }>;
  unchanged: number;
  duplicateCodes: string[];
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
      if (!duplicateCodes.includes(row.code)) duplicateCodes.push(row.code);
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
}

const unitKey = (courseId: string, unitNumber: number) => `${courseId}:${unitNumber}`;

export function planUnitUpserts(
  catalog: CatalogCourse[],
  existing: Array<Record<string, any>>,
  courseIdByCode: Map<string, string>,
): UnitPlan {
  const plan: UnitPlan = { create: [], update: [], unchanged: 0, skippedCourses: [] };

  // Index existing units by both the id-based key and the legacy code-based key,
  // because pre-migration rows still hold a course code in course_id.
  const byKey = new Map<string, Record<string, any>>();
  for (const row of existing) {
    byKey.set(unitKey(String(row.course_id), Number(row.unit_number)), row);
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

      const row =
        byKey.get(unitKey(courseId, unit.number)) ??
        byKey.get(unitKey(course.code, unit.number));

      if (!row) {
        plan.create.push(desired);
        return;
      }

      const data: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(desired)) {
        if (row[field] !== value) data[field] = value;
      }
      if (Object.keys(data).length > 0) plan.update.push({ id: row.id, data });
      else plan.unchanged++;
    });
  }

  return plan;
}
```

- [ ] **Step 4: Run the tests**

```bash
npm test -- base44/functions/seedCatalog/planner
```

Expected: all 9 assertions PASS.

- [ ] **Step 5: Put the planner types under a type checker**

Vitest transpiles TypeScript with esbuild, which **strips types without checking them**. Until this step, the `CoursePlan`/`UnitPlan` interfaces enforce nothing — a planner returning the wrong shape would only fail if a test happened to assert on that exact field. Since the whole premise of this plan is that the risky logic is both typed and tested, wire up the checker now that the first `.ts` files exist.

`npm run typecheck` uses `jsconfig.json`, whose `include` covers only `src/components`, `src/pages`, and `src/Layout.jsx`, so it will never see `base44/`. Add a second project.

Create `tsconfig.base44.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "types": []
  },
  "include": [
    "base44/functions/*/planner.ts",
    "base44/functions/*/catalog.ts",
    "base44/functions/*/*.test.ts"
  ]
}
```

`allowImportingTsExtensions` is required because these modules import each other with explicit `./planner.ts` specifiers (Deno style). `"types": []` keeps Node and Deno globals out, which is what you want: it will now be a **type error** if a pure planner module reaches for `Deno` or a Node API, enforcing the pure/IO split that keeps these modules testable.

Note the `include` list deliberately excludes `entry.ts`. Those files import `npm:@base44/sdk@0.8.25` and call `Deno.serve`, neither of which `tsc` can resolve — attempting to check them produces a wall of unfixable errors.

Then in `package.json`, add a **separate** script rather than chaining onto `typecheck`:

```json
    "typecheck:base44": "tsc -p ./tsconfig.base44.json",
```

Chaining was the original instruction and it is the wrong call here. `npm run typecheck` currently exits 2 with roughly 450 pre-existing errors from `src/` and `node_modules/react-katex`, so a chained command can never go green and the new check would be invisible inside the noise. As its own script it is a real gate that passes today and fails only when someone breaks it.

This step landed early, during Task 1.2, because that task needed the strict check to verify `catalog.ts`. If `tsconfig.base44.json` and the script already exist, confirm they match the above and move on.

Run it:

```bash
npx tsc -p ./tsconfig.base44.json
```

Expected: no output, exit 0. If it reports errors in `planner.ts` or `catalog.ts`, they are real type bugs — fix them rather than loosening the config.

- [ ] **Step 6: Commit**

```bash
git add base44/functions/seedCatalog/planner.ts base44/functions/seedCatalog/planner.test.ts tsconfig.base44.json package.json
git commit -m "feat: add tested course and unit upsert planner"
```

## Task 1.4: Seed function entry point

**Files:**
- Create: `base44/functions/seedCatalog/entry.ts`
- Modify: `base44/entities/Unit.jsonc`, `base44/entities/Topic.jsonc`, `base44/entities/Question.jsonc` (add `course_code`)

- [ ] **Step 1: Add the transitional `course_code` field to the content entities**

In `base44/entities/Unit.jsonc`, add inside `"properties"` after `course_id`:

```jsonc
    "course_code": {
      "type": "string",
      "description": "TRANSITIONAL: denormalised Course.code. Never use as a join key. Removed in Milestone 4."
    },
```

Apply the identical block to `base44/entities/Topic.jsonc` and `base44/entities/Question.jsonc`.

- [ ] **Step 2: Write the entry point**

Create `base44/functions/seedCatalog/entry.ts`:

```ts
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

    // Re-read courses so newly created rows contribute their ids.
    const courses = dryRun && coursePlan.create.length > 0 ? [] : await listAll(svc.Course);
    const courseIdByCode = new Map<string, string>(courses.map((c: any) => [c.code, c.id]));

    const unitPlan = planUnitUpserts(CATALOG, await listAll(svc.Unit), courseIdByCode);
    if (!dryRun) {
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
        created: unitPlan.create.length,
        updated: unitPlan.update.length,
        unchanged: unitPlan.unchanged,
        skipped_courses: unitPlan.skippedCourses,
      },
    });
  } catch (error) {
    console.error('seedCatalog error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
```

- [ ] **Step 3: Dry run first**

Deploy, then from the admin browser console:

```js
const { base44 } = await import("/src/api/base44Client.js");
await base44.functions.invoke("seedCatalog", { dry_run: true })
```

Expected on a fresh database: `courses.created: 10`, `units.skipped_courses` listing all 10 codes (because no `Course` rows exist yet, so no ids can be resolved during a dry run). That is correct dry-run behaviour, not a bug.

- [ ] **Step 4: Apply, then apply again**

```js
await base44.functions.invoke("seedCatalog", { dry_run: false })
```

Expected first run: `courses.created: 10` and `units.created` equal to the total unit count in the catalog (85 with the BC override in place — confirm against your own port).

Run the identical call a second time. Expected: `created: 0` for both, `updated: 0`, `unchanged` equal to the previous created counts. **If the second run creates anything, the planner's matching key is wrong — stop and fix it before continuing.** This idempotency check is the whole point of the task.

- [ ] **Step 5: Commit**

```bash
git add base44/functions/seedCatalog/entry.ts base44/entities/Unit.jsonc base44/entities/Topic.jsonc base44/entities/Question.jsonc
git commit -m "feat: add idempotent catalog seeder for courses and units"
```

## Task 1.5: Make the topic seeder idempotent

`seedCourseContent` currently has no existence check (`entry.ts:89-91` blind-creates) so every invocation duplicates every topic. It also has dead code (`deleteRecords` at `:57-61` is never called) and its own catalog copy.

**Files:**
- Rewrite: `base44/functions/seedCourseContent/entry.ts`

- [ ] **Step 1: Replace the file entirely**

Overwrite `base44/functions/seedCourseContent/entry.ts` with:

```ts
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
```

- [ ] **Step 2: Dry run**

```js
await base44.functions.invoke("seedCourseContent", { dry_run: true })
```

Expected: `missing_units: []` (Task 1.4 created them all) and `topics_pending` equal to the total topic count in the catalog.

- [ ] **Step 3: Apply, then apply again**

```js
await base44.functions.invoke("seedCourseContent", { dry_run: false })
```

Then run the identical call again. Expected second run: `topics_pending: 0`, `topics_created: 0`. **If the second run wants to create topics, the idempotency key is wrong — fix before continuing.**

- [ ] **Step 4: Re-run the audit and compare**

```js
await base44.functions.invoke("migrationAudit", {})
```

Expected changes versus the Task 0.2 baseline: `counts.Course` is 10, `counts.Unit` and `counts.Topic` are non-zero, `blockers.units_table_empty` is `false`, `blockers.duplicate_course_codes` is `[]`. Note that `course_id_shape.Unit` and `.Topic` now show `id` (the seeder writes real ids) while `Enrollment`/`Progress`/`Exam` still show `code`. That split is expected at this point.

- [ ] **Step 5: Commit**

```bash
git add base44/functions/seedCourseContent/entry.ts
git commit -m "fix: make topic seeder idempotent and drop duplicated catalog"
```

## Task 1.6: Fix the silent 50-row cap on admin queries

**Do this before any count-based verification in Milestones 2 and 3, or those checks will compare two wrong numbers and look fine.**

`EntityHandler.list()` defaults to **`limit: 50`** (`node_modules/@base44/sdk/dist/modules/entities.types.d.ts:217`). Every admin page calls `list()` with no limit, so all admin statistics are currently computed over at most 50 rows per table:

| File:line | Call | Rows actually fetched |
|---|---|---|
| `AdminOverview.jsx:26-29` | `User.list()`, `Enrollment.list()`, `Exam.list()`, `TutoringSession.list()` | 50 each |
| `AdminStudents.jsx:27-29` | `User.list()`, `Enrollment.list()`, `Exam.list()` | 50 each |
| `AdminReports.jsx:30-33` | `User.list()`, `Enrollment.list()`, `Exam.list()`, `Progress.list()` | 50 each |
| `AdminSessions.jsx:27-28` | `TutoringSession.list("-created_date")`, `User.list()` | 50 each |
| `AdminRoles.jsx:97,115,118` | `User.list()` | 50 each |
| `Tutoring.jsx:47` | `User.list()` (the tutor picker) | 50 |

**Files:**
- Create: `src/lib/fetchAll.js`
- Modify: the six files above

- [ ] **Step 1: Add a paginating helper**

Create `src/lib/fetchAll.js`:

```js
const PAGE_SIZE = 5000; // Base44's maximum rows per request
const MAX_REQUESTS = 1000;

/**
 * Reads an entire entity table. Base44's list() defaults to 50 rows and caps
 * at 5000, so anything that computes totals must paginate.
 */
export async function fetchAll(entity, sort = "-created_date") {
  const rows = [];
  for (let skip = 0, requests = 0; ; ) {
    // The loop stops on an empty page, so a backend that ignored `skip` would
    // otherwise spin forever and hang the tab.
    if (++requests > MAX_REQUESTS) {
      throw new Error(`fetchAll exceeded ${MAX_REQUESTS} requests after ${rows.length} rows`);
    }
    const page = await entity.list(sort, PAGE_SIZE, skip);
    if (page.length === 0) break;
    rows.push(...page);
    // Advance by what the server actually returned, never by what we asked for,
    // so a server-side page clamp below PAGE_SIZE cannot silently skip rows.
    skip += page.length;
  }
  return rows;
}
```

- [ ] **Step 2: Replace every unbounded `list()` in those six files**

For example in `AdminOverview.jsx`, lines 26-29 become:

```jsx
        fetchAll(base44.entities.User),
        fetchAll(base44.entities.Enrollment),
        fetchAll(base44.entities.Exam),
        fetchAll(base44.entities.TutoringSession),
```

with `import { fetchAll } from "@/lib/fetchAll";` added at the top. Apply the same substitution in `AdminStudents.jsx`, `AdminReports.jsx`, `AdminSessions.jsx` (keep its `"-created_date"` sort), `AdminRoles.jsx`, and `Tutoring.jsx:47`.

Leave `AdminCourses.jsx:30` (`Course.list()`) and `AdminBilling.jsx:32,38` (`Subscription.list()`) alone — those tables hold about 10 rows each and 50 is a safe ceiling. Note the rationale in a comment so a future reader does not "fix" them.

- [ ] **Step 3: Verify the numbers actually change**

```bash
npm run dev
```

Open `/admin` and compare the student count and total-enrollment figures with `counts` from the Task 0.2 audit. They must now match. Before this change, any table with more than 50 rows was under-reported.

- [ ] **Step 4: Lint and commit**

```bash
npm run lint
git add src/lib/fetchAll.js src/pages/admin src/pages/Tutoring.jsx
git commit -m "fix: paginate admin queries past the 50-row list default"
```

---

# Milestone 2 — Expand and backfill

**Ships:** every row carries both an honest legacy field and a real id. Reads still use the legacy field, so the app keeps working throughout.

## Task 2.1: Add transitional fields to the schemas

**Files:**
- Modify: `base44/entities/Enrollment.jsonc`, `Progress.jsonc`, `Exam.jsonc`, `TutoringSession.jsonc`, `Payment.jsonc`

- [ ] **Step 1: Add `course_code` and `student_email`**

To each of `Enrollment.jsonc`, `Progress.jsonc`, and `Exam.jsonc`, add inside `"properties"`:

```jsonc
    "course_code": {
      "type": "string",
      "description": "TRANSITIONAL: denormalised Course.code. Never use as a join key. Removed in Milestone 4."
    },
    "student_email": {
      "type": "string",
      "description": "TRANSITIONAL: the email that student_id used to hold. Removed in Milestone 4."
    },
```

- [ ] **Step 2: Add all three to `TutoringSession.jsonc`, and make `tutor_id` optional**

Add the two properties above plus:

```jsonc
    "tutor_email": {
      "type": "string",
      "description": "TRANSITIONAL: the email that tutor_id used to hold. Removed in Milestone 4."
    },
```

Then change the `"required"` array from:

```jsonc
  "required": [
    "tutor_id",
    "student_id",
    "scheduled_date",
    "scheduled_time"
  ]
```

to:

```jsonc
  "required": [
    "student_id",
    "scheduled_date",
    "scheduled_time"
  ]
```

`tutor_id` becomes optional so an unassigned session can leave it absent instead of storing the sentinel string `"pending"`. `status: "pending"` already carries that meaning.

- [ ] **Step 3: Add `user_id` to `Payment.jsonc`**

```jsonc
    "user_id": {
      "type": "string",
      "description": "User.id of the payer, taken from the authenticated session. Set by Milestone 4."
    },
```

- [ ] **Step 4: Verify the schemas are valid JSON with comments**

```bash
node --input-type=module -e "import fs from 'node:fs'; for (const f of ['Enrollment','Progress','Exam','TutoringSession','Payment','Unit','Topic','Question']) { const raw = fs.readFileSync('base44/entities/'+f+'.jsonc','utf8').replace(/^\s*\/\/.*$/gm,''); JSON.parse(raw); console.log(f,'ok'); }"
```

Expected: `ok` for all eight.

- [ ] **Step 5: Commit**

```bash
git add base44/entities/
git commit -m "feat: add transitional email and code fields to entity schemas"
```

## Task 2.2: Dual-write and fallback-read

Every writer starts populating the transitional field; every reader prefers it and falls back to the old field. After this task the app no longer depends on `student_id` or `course_id` containing names, which is what makes Task 2.5 safe.

There are exactly four frontend writers.

**Files:**
- Modify: `src/pages/Courses.jsx:39-42`
- Modify: `src/pages/TopicLesson.jsx:103-108`
- Modify: `src/pages/Practice.jsx:67-70`
- Modify: `src/pages/Tutoring.jsx:70-73`

- [ ] **Step 1: `Courses.jsx` — enrollment create**

Replace the `Enrollment.create` call (lines 39-42) with:

```jsx
      await base44.entities.Enrollment.create({
        student_id: user?.email,
        student_email: user?.email,
        course_id: courseCode,
        course_code: courseCode,
        enrolled_at: new Date().toISOString(),
      });
```

- [ ] **Step 2: `TopicLesson.jsx` — progress create**

Replace the `Progress.create` call (lines 103-108) with:

```jsx
        await base44.entities.Progress.create({
          student_id: user?.email,
          student_email: user?.email,
          course_id: courseCode,
          course_code: courseCode,
          unit_id: topic?.unit_id,
          topic_id: topicId,
          status: "completed",
          mastery_score: 100,
          last_studied: new Date().toISOString(),
        });
```

- [ ] **Step 3: `Practice.jsx` — exam create**

In the `Exam.create` call starting at line 67, add two fields immediately after `student_id` and `course_id` respectively:

```jsx
        student_id: user?.email,
        student_email: user?.email,
        course_id: selectedCourse,
        course_code: selectedCourse,
```

Leave the rest of the object untouched.

- [ ] **Step 4: `Tutoring.jsx` — session create, and retire the `"pending"` sentinel**

Replace the `TutoringSession.create` call (lines 70-73 onward) with:

```jsx
      await base44.entities.TutoringSession.create({
        student_id: user?.email,
        student_email: user?.email,
        ...(form.tutor_id ? { tutor_id: form.tutor_id, tutor_email: form.tutor_id } : {}),
        course_id: form.course_id,
        course_code: form.course_id,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        end_time: form.end_time,
        duration_minutes: durationMinutes,
        notes: form.notes,
        status: "pending",
      });
```

- [ ] **Step 5: Update the two `"pending"` readers in `Tutoring.jsx`**

Line 117 currently reads `session.tutor_id && session.tutor_id !== "pending"`. Replace that condition with:

```jsx
                  {session.tutor_id ? (
```

and line 118's lookup with:

```jsx
                    tutors.find(t => t.email === (session.tutor_email || session.tutor_id))
```

- [ ] **Step 6: Verify by hand**

```bash
npm run dev
```

As a student: enrol in a course, complete a topic, start a practice exam, and book a tutoring session leaving the tutor unselected. Then in the browser console confirm the new fields are present and the sentinel is gone:

```js
const { base44 } = await import("/src/api/base44Client.js");
const me = await base44.auth.me();
const rows = await base44.entities.Enrollment.filter({ student_id: me.email });
console.log(rows.map(r => ({ student_id: r.student_id, student_email: r.student_email, course_id: r.course_id, course_code: r.course_code })));
const s = await base44.entities.TutoringSession.filter({ student_id: me.email });
console.log(s.map(r => r.tutor_id)); // must be undefined, never "pending"
```

- [ ] **Step 7: Lint and commit**

```bash
npx eslint src/pages/Courses.jsx src/pages/TopicLesson.jsx src/pages/Practice.jsx src/pages/Tutoring.jsx
git add src/pages/Courses.jsx src/pages/TopicLesson.jsx src/pages/Practice.jsx src/pages/Tutoring.jsx
git commit -m "feat: dual-write transitional email and code fields"
```

## Task 2.3: Backfill the transitional fields

**Files:**
- Create: `base44/functions/backfillLegacyNames/entry.ts`

- [ ] **Step 1: Write the function**

Create `base44/functions/backfillLegacyNames/entry.ts`:

```ts
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
```

Note the `course_code` guard skips values containing `@`. That is defensive: it prevents a mis-shaped row from writing an email into a code field.

- [ ] **Step 2: Dry run, then apply, then re-run**

```js
await base44.functions.invoke("backfillLegacyNames", { dry_run: true })
await base44.functions.invoke("backfillLegacyNames", { dry_run: false })
await base44.functions.invoke("backfillLegacyNames", { dry_run: true })
```

Expected: the first dry run reports non-zero `pending` per table; the apply writes that many; the final dry run reports `pending: 0` everywhere. A non-zero final count means rows exist whose `student_id` is neither an email nor already migrated — investigate those individually before continuing.

- [ ] **Step 3: Commit**

```bash
git add base44/functions/backfillLegacyNames/entry.ts
git commit -m "feat: backfill transitional email and code fields"
```

## Task 2.4: Switch reads onto the transitional fields

This is the step that decouples the app from `student_id`/`course_id` so they can be safely overwritten. Every read below becomes "prefer the transitional field, fall back to the legacy one".

**Files:**
- Modify: `src/pages/Dashboard.jsx:29-31,45,119`
- Modify: `src/pages/Courses.jsx:28-29,53,56`
- Modify: `src/pages/CourseDetail.jsx:37-39`
- Modify: `src/pages/TopicLesson.jsx:47`
- Modify: `src/pages/Practice.jsx:43-44,51,64`
- Modify: `src/pages/PracticeExam.jsx:78`
- Modify: `src/pages/ProgressPage.jsx:24-26,35,49`
- Modify: `src/pages/Tutoring.jsx:46,99`
- Modify: `src/pages/admin/AdminOverview.jsx:105,123,151`
- Modify: `src/pages/admin/AdminStudents.jsx:44-45,108-109`
- Modify: `src/pages/admin/AdminSessions.jsx:101,115`
- Modify: `src/pages/admin/AdminReports.jsx:44,49,179`
- Modify: `src/components/tutoring/GoogleStyleSessionCalendar.jsx:45,60`

- [ ] **Step 1: Change every student-scoped `filter` to query the transitional field**

Because `student_email` is now populated on every row, the filters become exact and stay correct after Task 2.5 overwrites `student_id`. Apply this substitution everywhere a filter uses `{ student_id: user?.email }`:

```jsx
{ student_email: user?.email }
```

Exact locations: `Dashboard.jsx:29,30,31`; `Courses.jsx:28,29`; `CourseDetail.jsx:39`; `TopicLesson.jsx:47`; `Practice.jsx:43,44`; `ProgressPage.jsx:24,25,26`; `Tutoring.jsx:46`.

For `CourseDetail.jsx:39` the filter also carries a course key, so it becomes:

```jsx
      base44.entities.Progress.filter({ student_email: user?.email, course_code: courseCode }),
```

- [ ] **Step 2: Change every course-scoped `filter` to `course_code`**

- `CourseDetail.jsx:37` → `base44.entities.Unit.filter({ course_code: courseCode })`
- `CourseDetail.jsx:38` → `base44.entities.Topic.filter({ course_code: courseCode })`
- `Practice.jsx:64` → `base44.entities.Unit.filter({ course_code: selectedCourse, unit_number: Number(selectedUnit) })`
- `PracticeExam.jsx:78` → `base44.entities.Question.filter({ course_code: e[0].course_code ?? e[0].course_id, is_active: true }, "created_date", 2000)`

- [ ] **Step 3: Change every in-memory comparison to prefer the transitional field**

Introduce one shared helper so the fallback logic is written once. Create `src/lib/legacyFields.js`:

```js
/**
 * Transitional accessors used while the *_id columns are migrated from
 * names to real record ids. Delete this module in Milestone 4.
 */
export const courseCodeOf = (row) => row?.course_code ?? row?.course_id ?? "";
export const studentEmailOf = (row) => row?.student_email ?? row?.student_id ?? "";
export const tutorEmailOf = (row) => row?.tutor_email ?? row?.tutor_id ?? "";
```

Then replace each comparison:

| File:line | Before | After |
|---|---|---|
| `Dashboard.jsx:45` | `e.course_id === c.code` | `courseCodeOf(e) === c.code` |
| `Dashboard.jsx:119` | `p.course_id === course.code` | `courseCodeOf(p) === course.code` |
| `Courses.jsx:53` | `e.course_id === code` | `courseCodeOf(e) === code` |
| `Courses.jsx:56` | `p.course_id === code` | `courseCodeOf(p) === code` |
| `Practice.jsx:51` | `e.course_id === c.code` | `courseCodeOf(e) === c.code` |
| `ProgressPage.jsx:35` | `e.course_id === c.code` | `courseCodeOf(e) === c.code` |
| `ProgressPage.jsx:49` | `p.course_id === course.code` | `courseCodeOf(p) === course.code` |
| `Tutoring.jsx:99` | `c.code === session.course_id` | `c.code === courseCodeOf(session)` |
| `AdminOverview.jsx:105` | `e.student_id === student.email` | `studentEmailOf(e) === student.email` |
| `AdminOverview.jsx:123` | `c.code === s.course_id` | `c.code === courseCodeOf(s)` |
| `AdminOverview.jsx:131` | `{s.student_id}` | `{studentEmailOf(s)}` |
| `AdminOverview.jsx:151` | `e.course_id === course.code` | `courseCodeOf(e) === course.code` |
| `AdminStudents.jsx:44` | `e.student_id === email` | `studentEmailOf(e) === email` |
| `AdminStudents.jsx:45` | `e.student_id === email` | `studentEmailOf(e) === email` |
| `AdminStudents.jsx:108` | `e.student_id === student.email` | `studentEmailOf(e) === student.email` |
| `AdminStudents.jsx:109` | `c.code === enr.course_id` | `c.code === courseCodeOf(enr)` |
| `AdminStudents.jsx:111` | `key={enr.course_id}` | `key={enr.id}` |
| `AdminSessions.jsx:101` | `c.code === s.course_id` | `c.code === courseCodeOf(s)` |
| `AdminSessions.jsx:113` | `s.course_id` | `courseCodeOf(s)` |
| `AdminSessions.jsx:115` | `getName(s.student_id)` | `getName(studentEmailOf(s))` |
| `AdminReports.jsx:44` | `e.course_id === selectedCourse` | `courseCodeOf(e) === selectedCourse` |
| `AdminReports.jsx:49` | `e.course_id === c.code` | `courseCodeOf(e) === c.code` |
| `AdminReports.jsx:179` | `e.student_id === s.email` | `studentEmailOf(e) === s.email` |
| `GoogleStyleSessionCalendar.jsx:45` | `c.code === session.course_id` | `c.code === courseCodeOf(session)` |
| `GoogleStyleSessionCalendar.jsx:53` | `session.course_id` | `courseCodeOf(session)` |
| `GoogleStyleSessionCalendar.jsx:60` | `getName(session.student_id)` | `getName(studentEmailOf(session))` |

Add the matching import to the top of each of those 13 files, for example:

```jsx
import { courseCodeOf, studentEmailOf } from "@/lib/legacyFields";
```

Import only the helpers each file actually uses, or ESLint's `unused-imports` rule will fail the build.

- [ ] **Step 4: Verify every student-facing and admin surface still works**

```bash
npm run dev
```

Walk each page and confirm data still renders: `/dashboard` (enrolled courses and progress bars), `/courses` (enrolled badges), `/courses/AP_CALC_AB` (units and topics), a topic lesson, `/practice` (course and unit pickers), `/progress`, `/tutoring`, `/admin`, `/admin/students`, `/admin/sessions`, `/admin/reports`. Counts must match what you saw before this task. Anything that goes blank means a filter is querying a field that was not backfilled — re-run Task 2.3's dry run.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add src/lib/legacyFields.js src/pages src/components/tutoring/GoogleStyleSessionCalendar.jsx
git commit -m "refactor: read transitional email and code fields with legacy fallback"
```

## Task 2.5: Foreign-key migration planner (pure, tested)

**Files:**
- Create: `base44/functions/migrateForeignKeys/planner.ts`
- Create: `base44/functions/migrateForeignKeys/planner.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `base44/functions/migrateForeignKeys/planner.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- base44/functions/migrateForeignKeys
```

Expected: FAIL — cannot resolve `./planner.ts`.

- [ ] **Step 3: Implement the planner**

Create `base44/functions/migrateForeignKeys/planner.ts`:

```ts
export interface CourseLookup {
  idSet: Set<string>;
  idByCode: Map<string, string>;
}

export interface UserLookup {
  idSet: Set<string>;
  idByEmail: Map<string, string>;
}

export interface PlanReport {
  updates: Array<Record<string, string>>;
  alreadyMigrated: number;
  empty: string[];
  unresolved: Array<{ id: string; value: string }>;
  conflicts: Array<{ id: string; byEmail: string; byCreatedBy: string }>;
  resolvedVia: { email: number; created_by_id: number };
}

function emptyReport(): PlanReport {
  return {
    updates: [], alreadyMigrated: 0, empty: [], unresolved: [],
    conflicts: [], resolvedVia: { email: 0, created_by_id: 0 },
  };
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function planCourseIdUpdates(
  rows: Array<Record<string, any>>,
  lookup: CourseLookup,
): PlanReport {
  const report = emptyReport();

  for (const row of rows) {
    const current = text(row.course_id);
    if (current && lookup.idSet.has(current)) {
      report.alreadyMigrated++;
      continue;
    }
    const code = text(row.course_code) || current;
    if (!code) {
      report.empty.push(row.id);
      continue;
    }
    const targetId = lookup.idByCode.get(code);
    if (!targetId) {
      report.unresolved.push({ id: row.id, value: code });
      continue;
    }
    report.updates.push({ id: row.id, course_id: targetId });
  }

  return report;
}

export function planUserIdUpdates(
  rows: Array<Record<string, any>>,
  lookup: UserLookup,
  idField: 'student_id' | 'tutor_id',
  emailField: 'student_email' | 'tutor_email',
): PlanReport {
  const report = emptyReport();

  for (const row of rows) {
    const current = text(row[idField]);
    if (current && lookup.idSet.has(current)) {
      report.alreadyMigrated++;
      continue;
    }

    const raw = text(row[emailField]) || (current.includes('@') ? current : '');
    const email = raw.toLowerCase();
    if (!email) {
      report.empty.push(row.id);
      continue;
    }

    const byEmail = lookup.idByEmail.get(email);
    const byCreatedBy =
      row.created_by_id && lookup.idSet.has(row.created_by_id) ? String(row.created_by_id) : '';

    if (byEmail && byCreatedBy && byEmail !== byCreatedBy) {
      report.conflicts.push({ id: row.id, byEmail, byCreatedBy });
    }

    // Email is the semantically intended link, so it wins. created_by_id only
    // rescues rows whose email no longer matches any User record.
    if (byEmail) {
      report.updates.push({ id: row.id, [idField]: byEmail });
      report.resolvedVia.email++;
      continue;
    }
    if (byCreatedBy) {
      report.updates.push({ id: row.id, [idField]: byCreatedBy });
      report.resolvedVia.created_by_id++;
      continue;
    }
    report.unresolved.push({ id: row.id, value: email });
  }

  return report;
}
```

- [ ] **Step 4: Run the tests**

```bash
npm test -- base44/functions/migrateForeignKeys
```

Expected: all 13 assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add base44/functions/migrateForeignKeys/planner.ts base44/functions/migrateForeignKeys/planner.test.ts
git commit -m "feat: add tested foreign key migration planner"
```

## Task 2.6: Run the foreign-key migration

**Files:**
- Create: `base44/functions/migrateForeignKeys/entry.ts`

- [ ] **Step 1: Write the entry point**

Create `base44/functions/migrateForeignKeys/entry.ts`:

```ts
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
```

- [ ] **Step 2: Dry run and read the report carefully**

```js
await base44.functions.invoke("migrateForeignKeys", { dry_run: true })
```

Before applying anything, three fields must be satisfactory:

- **`unresolved`** — every entry is a row that will keep its old value. For `course_id`, an unresolved code means no `Course` row has that code; create it in `/admin/courses` (or fix the typo) and re-run the dry run. For `student_id`, it means the email matches no `User` **and** `created_by_id` is unusable — most likely a deleted account. Decide per row: delete the orphaned row, or create/re-invite the user.
- **`conflicts`** — email and `created_by_id` point at different users. Expect zero. Any entry means someone created a row on another user's behalf; inspect those rows by hand before applying, because the planner will trust the email.
- **`empty`** — rows with no identifier at all. For `tutor_id` on `TutoringSession` a large `empty` count is normal and correct (unassigned sessions).

- [ ] **Step 3: Confirm the snapshot is current, then apply**

Re-take the Task 0.3 snapshot if anything has changed since. Then:

```js
await base44.functions.invoke("migrateForeignKeys", { dry_run: false })
```

- [ ] **Step 4: Verify convergence by re-running**

```js
await base44.functions.invoke("migrateForeignKeys", { dry_run: true })
```

Expected: `pending: 0` for every table, and `already_migrated` equal to the row count of each table minus its `empty` and `unresolved` counts. This proves the migration is complete and idempotent.

- [ ] **Step 5: Confirm with the independent audit**

```js
await base44.functions.invoke("migrationAudit", {})
```

Expected versus the Task 0.2 baseline: `course_id_shape` shows `code: 0` and `unknown: 0` for every table, with `id` carrying the full count. `student_id_shape` shows `email: 0` and `sentinel: 0`. `tutor_id_shape` shows `sentinel: 0`.

- [ ] **Step 6: Verify the app still works**

Reload the app and walk the same pages as Task 2.4 Step 4. Everything must still render, because all reads currently go through `course_code`/`student_email`, which this task did not touch. **If a page breaks here, a read was missed in Task 2.4** — find it before proceeding.

- [ ] **Step 7: Commit**

```bash
git add base44/functions/migrateForeignKeys/entry.ts
git commit -m "feat: migrate course, student, and tutor foreign keys to record ids"
```

---

# Milestone 3 — Switch reads to ids

**Ships:** the app reads real ids and the database is the only course catalog. The static `COURSES` array is deleted.

## Task 3.1: Course registry

**Files:**
- Create: `src/lib/courseRegistry.js`
- Create: `src/lib/courseRegistry.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/courseRegistry.test.js`:

```js
import { describe, expect, it } from "vitest";
import { buildRegistry } from "@/lib/courseRegistry";

const courses = [
  { id: "c1", code: "AP_CALC_AB", name: "AP Calculus AB", order: 1 },
  { id: "c2", code: "AP_STATS", name: "AP Statistics", order: 2 },
];

describe("buildRegistry", () => {
  it("indexes courses by id and by code", () => {
    const registry = buildRegistry(courses);
    expect(registry.byId.get("c1").code).toBe("AP_CALC_AB");
    expect(registry.idByCode.get("AP_CALC_AB")).toBe("c1");
    expect(registry.codeById.get("c2")).toBe("AP_STATS");
  });

  it("preserves the incoming order", () => {
    expect(buildRegistry(courses).courses.map((c) => c.code)).toEqual([
      "AP_CALC_AB",
      "AP_STATS",
    ]);
  });

  it("handles an empty catalog without throwing", () => {
    const registry = buildRegistry([]);
    expect(registry.courses).toEqual([]);
    expect(registry.idByCode.size).toBe(0);
  });

  it("ignores rows with no code", () => {
    const registry = buildRegistry([{ id: "c3", name: "Broken" }]);
    expect(registry.idByCode.size).toBe(0);
    expect(registry.byId.get("c3").name).toBe("Broken");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/lib/courseRegistry
```

Expected: FAIL — cannot resolve `@/lib/courseRegistry`.

- [ ] **Step 3: Implement the registry**

Create `src/lib/courseRegistry.js`:

```js
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const COURSE_REGISTRY_KEY = ["courses", "registry"];

export function buildRegistry(courses) {
  const byId = new Map();
  const idByCode = new Map();
  const codeById = new Map();
  for (const course of courses) {
    byId.set(course.id, course);
    if (course.code) {
      idByCode.set(course.code, course.id);
      codeById.set(course.id, course.code);
    }
  }
  return { courses, byId, idByCode, codeById };
}

export async function fetchCourseRegistry() {
  const courses = await base44.entities.Course.filter({ is_active: true }, "order", 200);
  return buildRegistry(courses);
}

/** Cached for the session; the catalog changes only when an admin edits it. */
export function useCourseRegistry() {
  return useQuery({
    queryKey: COURSE_REGISTRY_KEY,
    queryFn: fetchCourseRegistry,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 4: Run the tests**

```bash
npm test -- src/lib/courseRegistry
```

Expected: all 4 assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/courseRegistry.js src/lib/courseRegistry.test.js
git commit -m "feat: add cached course registry backed by the Course table"
```

## Task 3.2: Switch student pages to ids

Each page loses its `COURSES` import, gains `useCourseRegistry`, and filters by `course_id`/`student_id` using real ids. `user.id` replaces `user.email` as the student key — `AuthContext` already exposes the raw `auth.me()` result (`AuthContext.jsx:97-98` sets it unmodified), so `user.id` is available with no context change.

You are editing the code as Task 2.4 left it: filters currently query `student_email`/`course_code` and comparisons currently go through the `courseCodeOf`/`studentEmailOf` helpers. Both go away here, which is what frees Task 4.1 to delete `src/lib/legacyFields.js`.

**Files:**
- Modify: `src/pages/Dashboard.jsx`, `Courses.jsx`, `CourseDetail.jsx`, `TopicLesson.jsx`, `Practice.jsx`, `PracticeExam.jsx`, `ProgressPage.jsx`, `Tutoring.jsx`

- [ ] **Step 1: `Dashboard.jsx`**

Replace `import { COURSES } from "@/lib/courseData";` (line 6) with:

```jsx
import { useCourseRegistry } from "@/lib/courseRegistry";
```

Inside the component, add `const { data: registry } = useCourseRegistry();` and change the three filters (lines 29-31) to key on `user?.id`:

```jsx
        base44.entities.Enrollment.filter({ student_id: user?.id }),
        base44.entities.Progress.filter({ student_id: user?.id }),
        base44.entities.Exam.filter({ student_id: user?.id }, "-created_date", 5),
```

Guard the effect so it does not fire before the user is loaded, and change the two joins (lines 45 and 119) to compare ids:

```jsx
  const enrolledCourses = (registry?.courses ?? []).filter(c =>
    enrollments.some(e => e.course_id === c.id)
  );
```

```jsx
            const courseProgress = progress.filter(p => p.course_id === course.id);
```

Line 124's link still uses the readable code, which now comes off the `Course` row: ``to={`/courses/${course.code}`}``.

- [ ] **Step 2: `Courses.jsx`**

Same import swap. Filters at 28-29 become `{ student_id: user?.id }`. The enrol handler (39-42) takes the course row instead of the code:

```jsx
  const handleEnroll = async (course) => {
    setEnrolling(course.id);
    try {
      await base44.entities.Enrollment.create({
        student_id: user?.id,
        course_id: course.id,
        enrolled_at: new Date().toISOString(),
      });
      await load();
    } finally {
      setEnrolling(null);
    }
  };
```

Update the call site at line 134 to `onClick={() => handleEnroll(course)}`, the search filter at 48 to read `registry?.courses ?? []`, the count at 69 to `registry?.courses?.length ?? 0`, and the two joins at 53/56 to compare `course.id`.

- [ ] **Step 3: `CourseDetail.jsx`**

The URL still carries a code, so resolve it through the registry. Replace `import { getCourseByCode } from "@/lib/courseData";` (line 5) with the registry import, then:

```jsx
  const { courseCode } = useParams();
  const { data: registry } = useCourseRegistry();
  const courseId = registry?.idByCode.get(courseCode);
  const course = courseId ? registry.byId.get(courseId) : null;
```

Gate loading on `courseId` being resolved, then change the three filters (37-39) to:

```jsx
        base44.entities.Unit.filter({ course_id: courseId }, "order", 100),
        base44.entities.Topic.filter({ course_id: courseId }, "order", 1000),
        base44.entities.Progress.filter({ student_id: user?.id, course_id: courseId }),
```

Critically, lines 113-114 currently join the **static** unit list to database units by `unit_number`:

```jsx
{course.units.map((unitDef, idx) => {
  const unit = units.find(u => u.unit_number === unitDef.number);
```

That join disappears entirely — units now come from the database, so there is nothing to reconcile. Replace the opening of that block with a direct map over the loaded rows, and derive the weight label from the stored numbers:

```jsx
        {units.map((unit, idx) => {
          const unitTopics = topicsForUnit(unit.id);
          const weight =
            unit.exam_weight_min == null
              ? null
              : unit.exam_weight_min === unit.exam_weight_max
                ? `${unit.exam_weight_min}%`
                : `${unit.exam_weight_min}-${unit.exam_weight_max}%`;
          return (
```

Inside the block, replace every `unitDef.title` with `unit.title`, every `unitDef.number` with `unit.unit_number`, and every `unitDef.weight` with the `weight` variable above (rendering nothing when it is `null`, which is the "Not assessed" case). Because `Unit.filter` at line 37 now sorts by `order`, `idx` still gives the display position.

Keep the topic grouping at line 57 (`topics.filter(t => t.unit_id === unitId)`) exactly as it is — it was already id-based and correct.

- [ ] **Step 4: `TopicLesson.jsx`**

Line 47's filter becomes `{ student_id: user?.id, topic_id: topicId }`. The progress create (103-108) becomes:

```jsx
        await base44.entities.Progress.create({
          student_id: user?.id,
          course_id: topic?.course_id,
          unit_id: topic?.unit_id,
          topic_id: topicId,
          status: "completed",
          mastery_score: 100,
          last_studied: new Date().toISOString(),
        });
```

`course_id` now comes off the loaded `topic` row, so the page no longer needs `courseCode` for data at all — only for the three breadcrumb links (129, 132, 219), which keep using the URL param.

- [ ] **Step 5: `Practice.jsx`**

Import swap; filters at 43-44 become `{ student_id: user?.id }`. `selectedCourse` becomes a course **id**: change the `SelectItem` values from `c.code` to `c.id` and the query-param bootstrap at line 27 to resolve through the registry:

```jsx
  const { data: registry } = useCourseRegistry();
  const defaultCourse = registry?.idByCode.get(searchParams.get("course") ?? "") ?? "";
```

The unit lookup at 64 becomes `base44.entities.Unit.filter({ course_id: selectedCourse, unit_number: Number(selectedUnit) })`. The exam create (67-70) uses `student_id: user?.id` and `course_id: selectedCourse`. The unit dropdown at 142 now maps over units fetched from the database for the selected course rather than `course.units`. `REAL_EXAM_CONFIG` in `src/lib/examConfig.js` is keyed by course code, so look it up with `registry.codeById.get(selectedCourse)`.

- [ ] **Step 6: `PracticeExam.jsx`**

One line changes. Line 78 becomes:

```jsx
      const questionBank = await base44.entities.Question.filter(
        { course_id: e[0].course_id, is_active: true }, "created_date", 2000,
      );
```

`e[0].course_id` is now a real id and `Question.course_id` was migrated in Task 2.6, so this join is correct. Line 79's `unit_id` filter was already correct.

- [ ] **Step 7: `ProgressPage.jsx`**

Import swap; the three filters at 24-26 become `{ student_id: user?.id }`; the joins at 35 and 49 compare `course.id`.

- [ ] **Step 8: `Tutoring.jsx`**

Import swap. Line 46 becomes `{ student_id: user?.id }`. The tutor picker at 184 changes from `value={t.email}` to `value={t.id}`, and the display lookup at 118 from `tutors.find(t => t.email === session.tutor_id)` to `tutors.find(t => t.id === session.tutor_id)`. The course picker at 152 uses `value={c.id}`. The session create becomes:

```jsx
      await base44.entities.TutoringSession.create({
        student_id: user?.id,
        ...(form.tutor_id ? { tutor_id: form.tutor_id } : {}),
        course_id: form.course_id,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        end_time: form.end_time,
        duration_minutes: durationMinutes,
        notes: form.notes,
        status: "pending",
      });
```

The course name lookup at 99 becomes `registry?.byId.get(session.course_id)`.

- [ ] **Step 9: Verify every student flow end to end**

```bash
npm run dev
```

As a student, complete the full journey: enrol from `/courses`, open the course, open a topic and mark it complete, start and submit a practice exam, check `/progress` reflects it, book a tutoring session with and without a tutor. Then re-check `/dashboard`. Every number must be consistent.

- [ ] **Step 10: Lint and commit**

```bash
npm run lint
npm test
git add src/pages/Dashboard.jsx src/pages/Courses.jsx src/pages/CourseDetail.jsx src/pages/TopicLesson.jsx src/pages/Practice.jsx src/pages/PracticeExam.jsx src/pages/ProgressPage.jsx src/pages/Tutoring.jsx
git commit -m "refactor: read student pages through course ids and user ids"
```

## Task 3.3: Switch admin pages to ids

Admin pages join `User` rows to child rows. Those joins now happen on `id` instead of `email`, which also removes the client-side email matching.

**The "Before" column below is the code as Task 2.4 left it**, not the original source — Task 2.4 already wrapped these comparisons in the `courseCodeOf`/`studentEmailOf` helpers. Those wrappers now come back out, which is why `src/lib/legacyFields.js` can be deleted in Task 4.1.

**Files:**
- Modify: `src/pages/admin/AdminOverview.jsx`, `AdminStudents.jsx`, `AdminSessions.jsx`, `AdminReports.jsx`
- Modify: `src/components/tutoring/GoogleStyleSessionCalendar.jsx`

- [ ] **Step 1: Replace every email join with an id join**

| File:line | Before (post-Task-2.4) | After |
|---|---|---|
| `AdminOverview.jsx:105` | `studentEmailOf(e) === student.email` | `e.student_id === student.id` |
| `AdminOverview.jsx:123` | `COURSES.find(c => c.code === courseCodeOf(s))` | `registry?.byId.get(s.course_id)` |
| `AdminOverview.jsx:131` | `{studentEmailOf(s)}` | `{getName(s.student_id)}` (add the same id-based `getName` helper used in `AdminSessions`) |
| `AdminOverview.jsx:150-151` | `COURSES.map(...)`, `courseCodeOf(e) === course.code` | `(registry?.courses ?? []).map(...)`, `e.course_id === course.id` |
| `AdminStudents.jsx:43-45` | `getStudentStats(email)` matching `studentEmailOf(e) === email` | `getStudentStats(studentId)` matching `e.student_id === studentId` |
| `AdminStudents.jsx:88` | `getStudentStats(student.email)` | `getStudentStats(student.id)` |
| `AdminStudents.jsx:90` | `key={student.email}` | `key={student.id}` |
| `AdminStudents.jsx:108-109` | `studentEmailOf(e) === student.email`, `c.code === courseCodeOf(enr)` | `e.student_id === student.id`, `registry?.byId.get(enr.course_id)` |
| `AdminSessions.jsx:55-57` | `users.find(u => u.email === email)` | `users.find(u => u.id === userId)` |
| `AdminSessions.jsx:101` | `COURSES.find(c => c.code === courseCodeOf(s))` | `registry?.byId.get(s.course_id)` |
| `AdminSessions.jsx:115` | `getName(studentEmailOf(s))` | `getName(s.student_id)` |
| `AdminReports.jsx:44` | `courseCodeOf(e) === selectedCourse` | `e.course_id === selectedCourse` (now an id) |
| `AdminReports.jsx:47-49` | `COURSES.map(...)`, `courseCodeOf(e) === c.code` | `(registry?.courses ?? []).map(...)`, `e.course_id === c.id` |
| `AdminReports.jsx:91` | `value={c.code}` | `value={c.id}` |
| `AdminReports.jsx:179` | `studentEmailOf(e) === s.email` | `e.student_id === s.id` |
| `AdminReports.jsx:191` | `key={s.email}` | `key={s.id}` |
| `GoogleStyleSessionCalendar.jsx:45` | `COURSES.find(c => c.code === courseCodeOf(session))` | accept a `courseById` prop and use `courseById?.get(session.course_id)` |
| `GoogleStyleSessionCalendar.jsx:60` | `getName(studentEmailOf(session))` | `getName(session.student_id)` |

- [ ] **Step 2: Pass the registry into the calendar component**

`GoogleStyleSessionCalendar` currently imports `COURSES` itself (line 4), which couples a presentational component to the static catalog. Remove that import, add `courseById` to its props (line 13), and pass it from both call sites (`AdminSessions.jsx:87` and the `Tutoring.jsx` usage) as `courseById={registry?.byId}`.

- [ ] **Step 3: Remove the now-unused `COURSES` imports**

Delete the `import { COURSES } from "@/lib/courseData";` line from `AdminOverview.jsx:9`, `AdminStudents.jsx:5`, `AdminSessions.jsx:5`, `AdminReports.jsx:5`, and `GoogleStyleSessionCalendar.jsx:4`, adding `useCourseRegistry` where needed.

- [ ] **Step 4: Verify each admin page**

```bash
npm run dev
```

Check `/admin` (student list with course counts, recent sessions, per-course enrollment counts), `/admin/students` (per-student course badges and exam stats), `/admin/sessions` (student and tutor names resolve, not raw ids), `/admin/reports` (course filter works, top-students list populates). **Any raw id shown where a name belongs means a `getName` call was missed.**

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add src/pages/admin src/components/tutoring/GoogleStyleSessionCalendar.jsx
git commit -m "refactor: join admin pages on record ids instead of emails"
```

## Task 3.4: Switch backend functions off the inlined course maps

**Files:**
- Modify: `base44/functions/enrichCourseContent/entry.ts:6-17,63`
- Modify: `base44/functions/generateQuestionBank/entry.ts:6-17,38,62,114-117`

- [ ] **Step 1: Replace `COURSE_NAMES` with a `Course` table lookup in both files**

Delete the `COURSE_NAMES` constant (lines 6-17 in each) and load real course rows instead. In `enrichCourseContent`, after the existing entity loads:

```ts
    const courses = await base44.asServiceRole.entities.Course.list('order', 200);
    const courseById = new Map(courses.map((c: any) => [c.id, c]));
```

Then line 63's `COURSE_NAMES[topic.course_id] || topic.course_id` becomes:

```ts
      course_name: courseById.get(topic.course_id)?.name ?? '',
```

Apply the identical change in `generateQuestionBank` (its equivalent is line 62).

- [ ] **Step 2: Fix the over-limit list call**

`generateQuestionBank/entry.ts:38` requests 10,000 rows, but the SDK caps `list` at 5,000, so it has been silently truncating and undercounting existing questions — which lets the function generate duplicates once the bank passes 5,000. Replace:

```ts
    const allQuestions = await base44.asServiceRole.entities.Question.list('created_date', 10000);
```

with a paginated read:

```ts
    const allQuestions: any[] = [];
    for (let skip = 0; ; skip += 5000) {
      const page = await base44.asServiceRole.entities.Question.list('created_date', 5000, skip);
      allQuestions.push(...page);
      if (page.length < 5000) break;
    }
```

- [ ] **Step 3: Confirm the question writer already uses ids**

`generateQuestionBank/entry.ts:114-117` writes `course_id: topic.course_id`. Because Task 2.6 migrated `Topic.course_id` to a real id, this now propagates an id with no change needed. Verify by reading the code and confirming no `course_code` is written.

- [ ] **Step 4: Verify against real data**

Deploy, then from the admin console:

```js
await base44.functions.invoke("enrichCourseContent", { dry_run: true })
```

If the function has no dry-run flag, invoke it scoped to a single course and confirm the response reports a non-zero pending count and that generated content mentions the correct course name (not a raw id).

- [ ] **Step 5: Commit**

```bash
git add base44/functions/enrichCourseContent/entry.ts base44/functions/generateQuestionBank/entry.ts
git commit -m "fix: read course names from the database and paginate the question list"
```

## Task 3.5: Delete the static catalog

**Files:**
- Delete: `src/lib/courseData.js`
- Modify: `src/pages/Landing.jsx:6,129-130`

- [ ] **Step 1: Switch the last consumer**

`Landing.jsx` is a public marketing page and the final `COURSES` reader. Replace the import at line 6 with `useCourseRegistry` and the map at 129 with `(registry?.courses ?? []).map(...)`, keeping `course.code` in the link at line 130. The `Course` table must be readable anonymously for this to work — if it is not, keep a minimal hardcoded list of course names in `Landing.jsx` only, and note that in a comment.

- [ ] **Step 2: Confirm nothing else imports it**

```bash
npx rg -n "courseData|COURSES|getCourseByCode" src base44
```

Expected: matches only inside `base44/functions/seedCatalog/` (the seed data, which is meant to keep its own copy). Zero matches under `src/`.

- [ ] **Step 3: Delete the file**

```bash
git rm src/lib/courseData.js
```

- [ ] **Step 4: Verify the build and the full app**

```bash
npm run lint
npm test
npm run build
```

Expected: all three succeed. Then `npm run dev` and confirm `/welcome`, `/courses`, and `/dashboard` all still list courses.

- [ ] **Step 5: Commit**

```bash
git add -A src/pages/Landing.jsx src/lib
git commit -m "refactor: delete static course catalog in favour of the Course table"
```

---

# Milestone 4 — Contract and guardrails

**Ships:** transitional fields removed, payment identity fixed, and a test that stops the anti-pattern coming back.

## Task 4.1: Drop the transitional fields

**Files:**
- Create: `base44/functions/dropLegacyFields/entry.ts`
- Modify: `base44/entities/Enrollment.jsonc`, `Progress.jsonc`, `Exam.jsonc`, `TutoringSession.jsonc`, `Unit.jsonc`, `Topic.jsonc`, `Question.jsonc`
- Delete: `src/lib/legacyFields.js`

- [ ] **Step 1: Confirm nothing reads them any more**

```bash
npx rg -n "student_email|course_code|tutor_email|legacyFields" src
```

Expected: zero matches. If anything remains, finish Milestone 3 first — dropping these fields while a read survives will silently blank out a page.

- [ ] **Step 2: Write the unset function**

Create `base44/functions/dropLegacyFields/entry.ts`:

```ts
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TARGETS: Record<string, string[]> = {
  Enrollment: ['student_email', 'course_code'],
  Progress: ['student_email', 'course_code'],
  Exam: ['student_email', 'course_code'],
  TutoringSession: ['student_email', 'tutor_email', 'course_code'],
  Unit: ['course_code'],
  Topic: ['course_code'],
  Question: ['course_code'],
};

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
    const report: Record<string, Record<string, number>> = {};

    for (const [entity, fields] of Object.entries(TARGETS)) {
      report[entity] = {};
      for (const field of fields) {
        if (dryRun) {
          const sample = await svc[entity].filter({ [field]: { $exists: true } }, '-created_date', 1);
          report[entity][field] = sample.length;
          continue;
        }
        let removed = 0;
        // The query excludes already-cleared rows, so each pass shrinks the set.
        for (;;) {
          const result = await svc[entity].updateMany(
            { [field]: { $exists: true } },
            { $unset: { [field]: '' } },
          );
          removed += result.updated;
          if (!result.has_more) break;
        }
        report[entity][field] = removed;
      }
    }

    return Response.json({ dry_run: dryRun, report });
  } catch (error) {
    console.error('dropLegacyFields error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
```

- [ ] **Step 3: Run it, then confirm it converges**

```js
await base44.functions.invoke("dropLegacyFields", { dry_run: true })
await base44.functions.invoke("dropLegacyFields", { dry_run: false })
await base44.functions.invoke("dropLegacyFields", { dry_run: true })
```

Expected: the final dry run reports `0` for every field.

- [ ] **Step 4: Remove the properties from the schemas and delete the helper**

Delete every `course_code`, `student_email`, and `tutor_email` property block from the seven `.jsonc` files listed above, then:

```bash
git rm src/lib/legacyFields.js
```

- [ ] **Step 5: Verify and commit**

```bash
npm run lint && npm test && npm run build
git add -A base44 src
git commit -m "refactor: drop transitional email and code fields"
```

## Task 4.2: Fix payment identity

Today `createCheckoutSession` and `createManualPayment` are **unauthenticated** and take the payer's email straight from the request body, so anyone can create a `Payment` row against any address. `stripeWebhook` never touches `User` at all.

**Files:**
- Modify: `base44/functions/createCheckoutSession/entry.ts:8,74-82`
- Modify: `base44/functions/createManualPayment/entry.ts:6,12-22`
- Modify: `src/pages/Pricing.jsx:53-56,64-66`

- [ ] **Step 1: Require authentication and derive the email from the session**

At the top of the handler in `createCheckoutSession/entry.ts`, before reading the body:

```ts
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
```

Then stop trusting the body's email. Remove `email` from the destructure at line 8 and use `user.email` throughout, and add the id to the `Payment.create` call (74-82):

```ts
      await base44.asServiceRole.entities.Payment.create({
        user_id: user.id,
        email: user.email,
        plan_id: planId,
        plan_type: planType,
        stripe_session_id: session.id,
        status: 'pending',
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || 'usd',
      });
```

Apply the same two changes to `createManualPayment/entry.ts` (auth gate, then `user_id: user.id` and `email: user.email` in the create at 12-22).

- [ ] **Step 2: Remove the email input from the pricing page**

`Pricing.jsx` collects `customerEmail` and sends it (lines 56 and 66). The backend now ignores it. Delete the email field and its state, and drop `email` from both `functions.invoke` payloads. Users must be logged in to check out; if the page is reachable anonymously, redirect to `/login` with a return path using the existing `resolvePostAuthPath` helper in `src/lib/authRedirect.js`.

- [ ] **Step 3: Backfill `user_id` on historical payments**

Add this block to `migrateForeignKeys/entry.ts`, immediately before the `return Response.json(result)` line. It reuses the tested planner by mapping each `Payment` onto the shape `planUserIdUpdates` expects, then renames the resulting key from `student_id` to `user_id`:

```ts
    const payments = await load('Payment');
    const paymentReport = planUserIdUpdates(
      payments.map((p: any) => ({
        id: p.id,
        student_id: p.user_id ?? '',
        student_email: p.email ?? '',
        created_by_id: p.created_by_id,
      })),
      userLookup,
      'student_id',
      'student_email',
    );
    const paymentUpdates = paymentReport.updates.map((u) => ({
      id: u.id,
      user_id: u.student_id,
    }));
    (result as any).payment_user_id = {
      ...summarise(paymentReport),
      pending: paymentUpdates.length,
    };
    if (!dryRun) await apply(svc.Payment, paymentUpdates);
```

Run it in dry-run first and review `unresolved` — payments made from addresses that never registered an account are expected, and those rows should stay unlinked rather than being guessed at.

- [ ] **Step 4: Verify**

Log out and confirm the checkout endpoints reject with 401:

```js
await base44.functions.invoke("createManualPayment", { planId: "x", planType: "monthly", amount: 1 })
```

Expected: a 401 error. Then log in, complete a manual payment, and confirm the new `Payment` row carries both `user_id` and the session's email.

- [ ] **Step 5: Commit**

```bash
git add base44/functions/createCheckoutSession/entry.ts base44/functions/createManualPayment/entry.ts base44/functions/migrateForeignKeys/entry.ts src/pages/Pricing.jsx
git commit -m "fix: derive payment identity from the authenticated session"
```

## Task 4.3: Guard against regression

A source-level test is the cheapest way to stop the next contributor writing `student_id: user.email`.

**Files:**
- Create: `src/lib/noNameKeys.test.js`

- [ ] **Step 1: Write the test**

Create `src/lib/noNameKeys.test.js`:

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/** Patterns that mean "a name is being used as a foreign key". */
const FORBIDDEN = [
  { name: "email written into student_id", re: /student_id:\s*[\w?.]*\.email/ },
  { name: "email written into tutor_id", re: /tutor_id:\s*[\w?.]*\.email/ },
  { name: "course code written into course_id", re: /course_id:\s*[\w?.]*\.code\b/ },
  { name: "'pending' sentinel in tutor_id", re: /tutor_id:\s*["']pending["']/ },
  { name: "student_id filtered by email", re: /student_id:\s*\w+\?\.email/ },
];

describe("no name-based foreign keys", () => {
  it("finds none of the forbidden patterns in src or base44", async () => {
    const files = await fg(["src/**/*.{js,jsx}", "base44/**/*.ts"], {
      cwd: ROOT,
      ignore: ["**/*.test.*", "**/seedCatalog/catalog.ts"],
    });

    const violations = [];
    for (const file of files) {
      const source = readFileSync(join(ROOT, file), "utf8");
      for (const { name, re } of FORBIDDEN) {
        if (re.test(source)) violations.push(`${file}: ${name}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Install the glob dependency**

```bash
npm install --save-dev fast-glob@^3.3.0
```

- [ ] **Step 3: Run it**

```bash
npm test -- src/lib/noNameKeys
```

Expected: PASS with an empty violations array. If it fails, the listed files still contain a name-based key — fix them; the test is correct.

- [ ] **Step 4: Run the whole suite and build**

```bash
npm test && npm run lint && npm run build
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/noNameKeys.test.js
git commit -m "test: fail the build if name-based foreign keys reappear"
```

## Task 4.4: Final verification

- [ ] **Step 1: Run the audit one last time**

```js
await base44.functions.invoke("migrationAudit", {})
```

Compare against the Task 0.2 baseline. Required end state:

- `course_id_shape` — every table reports `id` equal to its row count; `code`, `email`, and `unknown` are all `0`.
- `student_id_shape` — every table reports `id` equal to its row count; `email` and `sentinel` are `0`.
- `tutor_id_shape` — `email` and `sentinel` are `0`; `empty` equals the number of unassigned sessions.
- `counts` — identical to the baseline for `Enrollment`, `Progress`, `Exam`, `TutoringSession`, `Payment`. **Any drop means data was lost — restore from the Task 0.3 snapshot.**
- `blockers.duplicate_course_codes` — `[]`.
- `payments.without_user_id` — only the historical payments you consciously left unresolved in Task 4.2. By this milestone the `user_id` field exists and is backfilled, so this number is finally meaningful; it should equal the count you accepted there, and `emails_matching_no_user` should explain every remaining one.
- `created_by_id` — every table reports `disagrees: 0`. `qualifying` is expected to fall to `0` here, because no `student_id` remains an email once the backfill has run; that is the success condition at this stage, not the ambiguous reading it would have been in the Milestone 0 baseline.

- [ ] **Step 2: Prove an email change no longer destroys a student's history**

This is the acceptance test for the whole plan. Pick a test student with enrollments and progress. Note their counts. Change their email in the admin UI (or via `auth.updateMe` as that user). Reload their dashboard. Enrollments, progress, and exam history must be **unchanged**. Before this migration, all of it would have vanished.

- [ ] **Step 3: Prove a course-code rename no longer orphans content**

`Course.code` is now immutable in the UI (Task 1.1), so verify via the database instead: change a `Course.code` directly with `base44.entities.Course.update(id, { code: "AP_X_RENAMED" })`, reload `/courses/AP_X_RENAMED`, and confirm units, topics, and progress all still resolve. Change it back afterwards.

- [ ] **Step 4: Update this document**

Add a `## Completed <date>` section recording the final audit JSON and any rows you deliberately left unresolved.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-08-11-id-based-entities.md
git commit -m "docs: record id migration completion and final audit"
```

---

## Rollback

There are no transactions, so rollback is manual and gets harder as milestones land.

| Point of failure | How to recover |
|---|---|
| Milestone 0-1 | Nothing destructive happened. `seedCatalog` only creates rows; delete the created `Course`/`Unit`/`Topic` rows if you must. |
| Task 2.3 (transitional backfill) | Harmless — it only fills empty fields. Re-run any time. |
| Task 2.6 (the id overwrite) | This is the only irreversible step. Restore `student_id`/`course_id`/`tutor_id` from the Task 0.3 snapshot with a `bulkUpdate` keyed on record `id`. Everything else is untouched, and `student_email`/`course_code` still hold the original values, so you can also rebuild in place without the snapshot. |
| Milestone 3 | Code-only. `git revert` the commits. |
| Task 4.1 (field drop) | The transitional fields are gone. Rebuild them by re-running Task 2.3 in reverse (derive `student_email` from `User.id` → email). |

The single highest-risk moment is Task 2.6 Step 3. Do not run it without a fresh snapshot and a clean `unresolved`/`conflicts` report.

## Open decisions deliberately left to the implementer

1. **Orphaned rows.** Task 2.6 Step 2 will surface enrollments and progress belonging to emails with no `User` record. Deleting them loses history; keeping them means they are invisible to every id-based query. Decide per row and record the choice.
2. **Anonymous access to the `Course` table.** Task 3.5 Step 1 assumes `/welcome` can read `Course` without auth. If Base44's row-level security forbids that, the marketing page needs either a public-read entity setting or a small hardcoded list.
3. **`Course.code` uniqueness is enforced in the UI only.** Base44's `.jsonc` schema has no unique-index option, so a duplicate could still be introduced through the platform dashboard or a raw API call. `migrationAudit` reports duplicates; run it periodically.

## Database-run checklist

Everything in Milestones 0 and 1 that touches the live database is collected here, because it needs an admin session and a deployed backend function — neither of which an agent has. The code for each step is already written and committed; this is the part only you can run.

Run the steps in order. Steps 1 and 2 are read-only and safe to run any time. Step 4 is the first step that writes.

**Step 1 — Deploy, then capture the audit baseline (read-only).** Push the branch so the platform deploys the functions. Then, logged in as an admin in the running app, open the browser console and run:

```js
await (await import("/src/api/base44Client.js")).base44.functions.invoke("migrationAudit", {})
```

Paste the full JSON into a new `## Audit baseline (recorded <date>)` section at the bottom of this document and commit it. Every later verification compares against these numbers, so they must be recorded, not just read. Then read the four fields called out in Task 0.2 Step 4 — in particular check `blockers.duplicate_course_codes` is `[]` and note whether `created_by_id` has a healthy `qualifying` count, because that determines whether the Task 2.6 fallback is trustworthy.

**Step 2 — Take a snapshot (read-only).** Run `exportSnapshot` per Task 0.3 and save the JSON file outside the repository. This is the only way back from Task 2.6. Do not proceed past Step 3 without it.

**Step 3 — Decide on the audit's findings.** If `blockers.units_table_empty` is `true`, Milestone 1 is confirmed mandatory. If `duplicate_course_codes` is non-empty, fix the duplicates in `/admin/courses` by hand and re-run Step 1 before continuing. If `orphans.emails_with_no_user` is non-empty, those rows need the per-row decision described in "Open decisions" item 1 — but that decision is not needed until Milestone 2, so simply record the list now.

**Step 4 — Seed the catalog (first write).** Run `seedCatalog` in dry-run mode first per Task 1.4, confirm the plan matches the number of courses and units you expect, then run it for real. This only creates rows; it never updates or deletes, so it is safe to re-run and safe to abandon.

**Step 5 — Re-run the audit and compare.** Invoke `migrationAudit` again. `blockers.units_table_empty` must now be `false`, `counts.Unit` must equal the catalog's unit count, and no other count may have decreased. A decrease means something destructive happened — stop and restore from the Step 2 snapshot.

**Step 6 — Seed topic content.** Run the idempotent seeder per Task 1.5 and confirm on a re-run that it reports zero new topics created, which is what proves idempotency on real data rather than in a mock.

After Step 6, Milestones 0 and 1 are complete on production and Milestone 2 can be planned against real numbers.
