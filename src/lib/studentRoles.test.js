import { describe, expect, it } from "vitest";
import { filterStudents, isStudentRole } from "@/lib/studentRoles";

describe("isStudentRole", () => {
  it("treats student, user, and missing roles as students", () => {
    expect(isStudentRole("student")).toBe(true);
    expect(isStudentRole("user")).toBe(true);
    expect(isStudentRole(undefined)).toBe(true);
    expect(isStudentRole(null)).toBe(true);
    expect(isStudentRole("")).toBe(true);
  });

  it("excludes staff roles", () => {
    expect(isStudentRole("admin")).toBe(false);
    expect(isStudentRole("tutor")).toBe(false);
    expect(isStudentRole("assistant")).toBe(false);
  });
});

describe("filterStudents", () => {
  it("keeps only student-like users", () => {
    const users = [
      { email: "a@x.com", role: "student" },
      { email: "b@x.com", role: "admin" },
      { email: "c@x.com", role: "user" },
      { email: "d@x.com" },
    ];
    expect(filterStudents(users).map((u) => u.email)).toEqual([
      "a@x.com",
      "c@x.com",
      "d@x.com",
    ]);
  });
});
