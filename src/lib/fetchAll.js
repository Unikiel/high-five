const PAGE_SIZE = 5000; // Base44's maximum rows per request
const MAX_REQUESTS = 1000;

/**
 * Reads an entire entity table. Base44's list() defaults to 50 rows and caps
 * at 5000, so anything that computes totals must paginate.
 */
export async function fetchAll(entity, sort = "-created_date") {
  const rows = [];
  for (let skip = 0, requests = 0; ; ) {
    if (++requests > MAX_REQUESTS) {
      throw new Error(`fetchAll exceeded ${MAX_REQUESTS} requests after ${rows.length} rows`);
    }
    const page = await entity.list(sort, PAGE_SIZE, skip);
    if (page.length === 0) break;
    rows.push(...page);
    skip += page.length;
  }
  return rows;
}
