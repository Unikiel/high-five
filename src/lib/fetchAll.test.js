import { describe, expect, it } from "vitest";
import { fetchAll } from "@/lib/fetchAll";

/** A mock entity that serves `rows` in pages of at most `pageCap` records. */
function mockEntity(rows, pageCap = Infinity) {
  const calls = [];
  return {
    calls,
    list: async (sort, limit, skip) => {
      calls.push({ sort, limit, skip });
      return rows.slice(skip, skip + Math.min(limit, pageCap));
    },
  };
}

describe("fetchAll", () => {
  it("returns every row when the table fits in one page", async () => {
    const entity = mockEntity([{ id: "a" }, { id: "b" }]);
    expect(await fetchAll(entity)).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("returns an empty array for an empty table without a second request", async () => {
    const entity = mockEntity([]);
    expect(await fetchAll(entity)).toEqual([]);
    expect(entity.calls).toHaveLength(1);
  });

  it("pages past a server-side clamp below the requested limit", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: i }));
    const entity = mockEntity(rows, 10);
    expect(await fetchAll(entity)).toEqual(rows);
    // Skip advances by rows actually returned, never by the requested limit.
    expect(entity.calls.map(c => c.skip)).toEqual([0, 10, 20, 25]);
  });

  it("requests the maximum page size and the default sort", async () => {
    const entity = mockEntity([{ id: "a" }]);
    await fetchAll(entity);
    expect(entity.calls[0]).toMatchObject({ sort: "-created_date", limit: 5000, skip: 0 });
  });

  it("passes an explicit sort through to every page", async () => {
    const entity = mockEntity([{ id: 1 }, { id: 2 }], 1);
    await fetchAll(entity, "created_date");
    expect(entity.calls.every(c => c.sort === "created_date")).toBe(true);
  });

  it("throws instead of looping forever when the backend ignores skip", async () => {
    const stuck = { list: async () => [{ id: "same" }] };
    await expect(fetchAll(stuck)).rejects.toThrow(/exceeded 1000 requests after 1000 rows/);
  });
});
