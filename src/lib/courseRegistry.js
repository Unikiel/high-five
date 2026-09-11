import { useQuery } from "@tanstack/react-query";

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
  // Lazy import so unit tests of buildRegistry do not load the Base44 client
  // (which requires `window` at module init).
  const { base44 } = await import("@/api/base44Client");
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
