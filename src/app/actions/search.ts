"use server";

import { runTravelSearch } from "@/lib/agents";
import type { ParsedTripRequest, SearchResult } from "@/types";

export async function searchTravelAction(
  query: string,
  parsedOverride?: ParsedTripRequest,
): Promise<{ ok: true; data: SearchResult } | { ok: false; error: string }> {
  try {
    if (!query.trim() && !parsedOverride) {
      return { ok: false, error: "Enter a trip request to continue." };
    }
    const data = await runTravelSearch(
      query.trim() || parsedOverride?.rawQuery || "",
      parsedOverride,
    );
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Search failed",
    };
  }
}
