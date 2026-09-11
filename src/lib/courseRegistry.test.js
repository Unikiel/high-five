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
