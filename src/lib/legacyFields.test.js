import { describe, expect, it } from "vitest";
import {
  byStudent,
  matchesCourse,
  matchesStudent,
} from "@/lib/legacyFields";

describe("byStudent", () => {
  it("matches id, email field, and legacy student_id email", () => {
    expect(byStudent({ id: "u1", email: "a@x.com" })).toEqual({
      $or: [
        { student_id: "u1" },
        { student_email: "a@x.com" },
        { student_id: "a@x.com" },
      ],
    });
  });
});

describe("matchesStudent", () => {
  it("matches by user id", () => {
    expect(matchesStudent({ student_id: "u1" }, { id: "u1", email: "a@x.com" })).toBe(true);
  });

  it("matches legacy email in student_id", () => {
    expect(matchesStudent({ student_id: "a@x.com" }, { id: "u1", email: "a@x.com" })).toBe(true);
  });

  it("matches student_email", () => {
    expect(matchesStudent({ student_email: "a@x.com" }, "a@x.com")).toBe(true);
  });
});

describe("matchesCourse", () => {
  it("matches by course id or code", () => {
    const course = { id: "c1", code: "AP_X" };
    expect(matchesCourse({ course_id: "c1" }, course)).toBe(true);
    expect(matchesCourse({ course_code: "AP_X" }, course)).toBe(true);
    expect(matchesCourse({ course_id: "AP_X" }, course)).toBe(true);
  });
});
