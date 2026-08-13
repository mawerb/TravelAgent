/** Inventory older than this is treated as stale and refreshed on the next search. */
export const INVENTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isInventoryStale(
  fetchedAt: string | Date | undefined | null,
  now = Date.now(),
): boolean {
  if (!fetchedAt) return true;
  const t = typeof fetchedAt === "string" ? Date.parse(fetchedAt) : fetchedAt.getTime();
  if (Number.isNaN(t)) return true;
  return now - t >= INVENTORY_TTL_MS;
}

export function inventoryAgeLabel(fetchedAt: string): string {
  const ageMs = Date.now() - Date.parse(fetchedAt);
  const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "fetched today";
  if (days === 1) return "1 day old";
  return `${days} days old`;
}

/** Fails loudly if TTL math breaks — run: npx tsx src/lib/inventory/ttl.selfcheck.ts */
export function assertInventoryTtl(): void {
  const now = Date.parse("2026-08-13T12:00:00.000Z");
  const fresh = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
  const stale = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
  if (isInventoryStale(fresh, now)) throw new Error("3-day inventory should be fresh");
  if (!isInventoryStale(stale, now)) throw new Error("8-day inventory should be stale");
  if (!isInventoryStale(undefined, now)) throw new Error("missing fetchedAt should be stale");
  if (!isInventoryStale(null, now)) throw new Error("null fetchedAt should be stale");
}
