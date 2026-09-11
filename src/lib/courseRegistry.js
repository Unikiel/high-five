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
