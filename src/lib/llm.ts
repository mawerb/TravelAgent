import type { ParsedTripRequest } from "@/types";
import {
  applyTripPatch,
  reviseParsedTrip,
} from "@/lib/clarify";
import { DEMO_EMPLOYEE } from "@/lib/session";

export interface LlmAdapter {
  parseTripRequest(query: string): Promise<ParsedTripRequest>;
  reviseTripRequest(
    current: ParsedTripRequest,
    message: string,
  ): Promise<{ parsed: ParsedTripRequest; reply: string; changed: boolean }>;
  explainRecommendation(input: {
    hotelName: string;
    distanceMiles: number;
    hotelMaxCents: number;
    brand: string;
  }): Promise<string>;
}

const VEGAS_PATTERN =
  /las vegas|mongodb\.local|sep(tember)?\s*22|keep me close|prefer(ably)?\s*united/i;

export class DemoLlmAdapter implements LlmAdapter {
  async parseTripRequest(query: string): Promise<ParsedTripRequest> {
    if (VEGAS_PATTERN.test(query) || process.env.DEMO_MODE === "true") {
      if (
        VEGAS_PATTERN.test(query) ||
        /mongodb\.local/i.test(query) ||
        /las vegas/i.test(query)
      ) {
        return {
          originAirport: DEMO_EMPLOYEE.homeAirport,
          destinationCity: "Las Vegas",
          destinationAirport: "LAS",
          startDate: "2026-09-22",
          endDate: "2026-09-25",
          purpose: "MongoDB.local",
          venueName: "MongoDB.local",
          preferredAirline: /united/i.test(query) ? "United" : "United",
          proximityPreferred:
            /close|near|proximity|venue/i.test(query) || true,
          rawQuery: query,
        };
      }
    }

    if (/nyc|new york/i.test(query)) {
      return {
        originAirport: DEMO_EMPLOYEE.homeAirport,
        destinationCity: "New York",
        destinationAirport: "JFK",
        startDate: "2026-08-20",
        endDate: "2026-08-22",
        purpose: "NYC next week",
        preferredAirline: "United",
        proximityPreferred: true,
        rawQuery: query,
      };
    }

    return {
      originAirport: DEMO_EMPLOYEE.homeAirport,
      destinationCity: "Las Vegas",
      destinationAirport: "LAS",
      startDate: "2026-09-22",
      endDate: "2026-09-25",
      purpose: "MongoDB.local",
      venueName: "MongoDB.local",
      preferredAirline: "United",
      proximityPreferred: true,
      rawQuery: query,
    };
  }

  async reviseTripRequest(
    current: ParsedTripRequest,
    message: string,
  ): Promise<{ parsed: ParsedTripRequest; reply: string; changed: boolean }> {
    return reviseParsedTrip(current, message);
  }

  async explainRecommendation(input: {
    hotelName: string;
    distanceMiles: number;
    hotelMaxCents: number;
    brand: string;
  }): Promise<string> {
    return `Based on your previous trips, you consistently prioritize proximity over small price differences. This hotel is ${input.distanceMiles.toFixed(1)} miles from the venue, is within Acme's $${(input.hotelMaxCents / 100).toFixed(0)}/night hotel limit, and matches your preference for ${input.brand} properties.`;
  }
}

type ReviseLlmJson = {
  reply?: string;
  patch?: Partial<ParsedTripRequest>;
};

/** Models sometimes return dollars; our fields are cents. */
function normalizeMoneyPatch(
  patch: Partial<ParsedTripRequest>,
): Partial<ParsedTripRequest> {
  const next = { ...patch };
  for (const key of [
    "maxFlightCents",
    "maxHotelNightlyCents",
    "maxTotalCents",
  ] as const) {
    const value = next[key];
    if (typeof value === "number" && value > 0 && value < 1000) {
      next[key] = Math.round(value * 100);
    }
  }
  return next;
}

export class OpenAiCompatibleAdapter implements LlmAdapter {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  async parseTripRequest(query: string): Promise<ParsedTripRequest> {
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Parse travel requests to JSON with originAirport, destinationCity, destinationAirport, startDate, endDate, purpose, venueName, preferredAirline, preferredHotelBrand, preferredCabin (economy|premium_economy|business), proximityPreferred, maxFlightCents, maxHotelNightlyCents, maxTotalCents. Dates ISO YYYY-MM-DD. Year 2026. Money fields are integer cents (e.g. $300 → 30000). Omit unknown fields.",
            },
            { role: "user", content: query },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error("LLM failed");
      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      const parsed = JSON.parse(
        data.choices[0]!.message.content,
      ) as ParsedTripRequest;
      return { ...parsed, rawQuery: query };
    } catch {
      return new DemoLlmAdapter().parseTripRequest(query);
    }
  }

  async reviseTripRequest(
    current: ParsedTripRequest,
    message: string,
  ): Promise<{ parsed: ParsedTripRequest; reply: string; changed: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You revise a corporate travel request from a short user message.
Return JSON: { "reply": string, "patch": { ...only fields to change } }.
Allowed patch keys: originAirport, destinationCity, destinationAirport, startDate, endDate, purpose, venueName, preferredAirline, preferredHotelBrand, preferredCabin (economy|premium_economy|business), proximityPreferred (boolean), maxFlightCents, maxHotelNightlyCents, maxTotalCents (integer USD cents; $300 = 30000).
If the user sets a flight/hotel/total budget or price limit, you MUST set the matching max*Cents field.
If nothing changed, return { "reply": "...", "patch": {} }.
Dates ISO YYYY-MM-DD. Year 2026 unless user specifies otherwise.`,
            },
            {
              role: "user",
              content: JSON.stringify({ current, message }),
            },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error("LLM revise failed");
      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      const parsedJson = JSON.parse(
        data.choices[0]!.message.content,
      ) as ReviseLlmJson;
      const patch = normalizeMoneyPatch(parsedJson.patch ?? {});
      const keys = Object.keys(patch).filter(
        (k) => (patch as Record<string, unknown>)[k] != null,
      );
      if (keys.length === 0) {
        // Fall back to heuristics if the model returned an empty patch
        return reviseParsedTrip(current, message);
      }
      const next = applyTripPatch(current, patch, message);
      return {
        parsed: next,
        reply:
          parsedJson.reply?.trim() ||
          `Updated ${keys.join(", ")}.`,
        changed: true,
      };
    } catch {
      return reviseParsedTrip(current, message);
    }
  }

  async explainRecommendation(input: {
    hotelName: string;
    distanceMiles: number;
    hotelMaxCents: number;
    brand: string;
  }): Promise<string> {
    return new DemoLlmAdapter().explainRecommendation(input);
  }
}

export function getLlmAdapter(): LlmAdapter {
  // DEMO_MODE keeps the initial scripted parse deterministic.
  if (process.env.DEMO_MODE === "true") {
    return new DemoLlmAdapter();
  }
  const key = process.env.OPENAI_API_KEY;
  const base = process.env.OPENAI_BASE_URL;
  if (key && base) return new OpenAiCompatibleAdapter(base, key);
  return new DemoLlmAdapter();
}

/**
 * Revisions always prefer a live LLM when keys exist — even in DEMO_MODE —
 * so free-form budget/preference tweaks actually affect the booking search.
 */
export function getReviseLlmAdapter(): LlmAdapter {
  const key = process.env.OPENAI_API_KEY;
  const base = process.env.OPENAI_BASE_URL;
  if (key && base) return new OpenAiCompatibleAdapter(base, key);
  return new DemoLlmAdapter();
}
