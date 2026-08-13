"use server";

import { TripRequestParser } from "@/lib/agents";
import { buildTripConfirmation } from "@/lib/clarify";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { getReviseLlmAdapter } from "@/lib/llm";
import type { ParsedTripRequest, TripConfirmation } from "@/types";

export async function clarifyTripAction(
  query: string,
): Promise<
  { ok: true; data: TripConfirmation } | { ok: false; error: string }
> {
  try {
    if (!query.trim()) {
      return { ok: false, error: "Enter a trip request to continue." };
    }
    await ensureDemoSeeded();
    const parsed = await TripRequestParser(query.trim());
    const built = buildTripConfirmation(parsed);
    return {
      ok: true,
      data: { parsed, ...built },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not understand request",
    };
  }
}

export async function reviseTripAction(
  current: ParsedTripRequest,
  message: string,
): Promise<
  | {
      ok: true;
      data: TripConfirmation & { reply: string };
    }
  | { ok: false; error: string }
> {
  try {
    if (!message.trim()) {
      return { ok: false, error: "Say what you’d like to change." };
    }
    const { parsed, reply, changed } =
      await getReviseLlmAdapter().reviseTripRequest(current, message.trim());
    const built = buildTripConfirmation(parsed);
    return {
      ok: true,
      data: {
        parsed,
        ...built,
        reply: changed
          ? reply
          : reply || "No changes applied — try rephrasing your request.",
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not apply revision",
    };
  }
}
