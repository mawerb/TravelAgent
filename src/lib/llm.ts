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

/** Only the scripted MongoDB.local Vegas prompt — not “prefer United” alone. */
export function isVegasDemoQuery(query: string): boolean {
  return (
    /mongodb\.local/i.test(query) ||
    (/las\s*vegas/i.test(query) &&
      /sep(?:t(?:ember)?)?\s*22/i.test(query))
  );
}

function vegasDemoParse(query: string): ParsedTripRequest {
  return {
    originAirport: DEMO_EMPLOYEE.homeAirport,
    destinationCity: "Las Vegas",
    destinationAirport: "LAS",
    startDate: "2026-09-22",
    endDate: "2026-09-25",
    purpose: "MongoDB.local",
    venueName: "MongoDB.local",
    preferredAirline: /united/i.test(query) ? "United" : "United",
    proximityPreferred: /close|near|proximity|venue/i.test(query) || true,
    rawQuery: query,
  };
}

export class DemoLlmAdapter implements LlmAdapter {
  async parseTripRequest(query: string): Promise<ParsedTripRequest> {
    if (isVegasDemoQuery(query)) {
      return vegasDemoParse(query);
    }

    if (/nyc|new york/i.test(query)) {
      return {
        originAirport: DEMO_EMPLOYEE.homeAirport,
        destinationCity: "New York",
        destinationAirport: "JFK",
        startDate: "2026-08-20",
        endDate: "2026-08-22",
        purpose: /customer/i.test(query) ? "Customer visit" : "NYC next week",
        preferredAirline: /delta/i.test(query)
          ? "Delta"
          : /american/i.test(query)
            ? "American"
            : "United",
        proximityPreferred: true,
        rawQuery: query,
      };
    }

    if (/chicago|\bord\b/i.test(query)) {
      return {
        originAirport: DEMO_EMPLOYEE.homeAirport,
        destinationCity: "Chicago",
        destinationAirport: "ORD",
        startDate: "2026-09-10",
        endDate: "2026-09-12",
        purpose: /offsite/i.test(query) ? "Team offsite" : "Chicago trip",
        preferredAirline: "United",
        proximityPreferred: true,
        rawQuery: query,
      };
    }

    if (/austin|\baus\b/i.test(query)) {
      return {
        originAirport: DEMO_EMPLOYEE.homeAirport,
        destinationCity: "Austin",
        destinationAirport: "AUS",
        startDate: "2026-09-15",
        endDate: "2026-09-17",
        purpose: /customer/i.test(query) ? "Customer visit" : "Austin trip",
        preferredAirline: "United",
        proximityPreferred: true,
        rawQuery: query,
      };
    }

    if (/seattle|\bsea\b/i.test(query)) {
      return {
        originAirport: DEMO_EMPLOYEE.homeAirport,
        destinationCity: "Seattle",
        destinationAirport: "SEA",
        startDate: "2026-09-08",
        endDate: "2026-09-10",
        purpose: "Seattle trip",
        preferredAirline: "Alaska",
        proximityPreferred: true,
        rawQuery: query,
      };
    }

    // No Vegas default — leave destination open for the confirm UI / LLM revise.
    return {
      originAirport: DEMO_EMPLOYEE.homeAirport,
      destinationCity: "Unknown",
      destinationAirport: "XXX",
      startDate: "2026-09-22",
      endDate: "2026-09-25",
      purpose: query.slice(0, 80),
      preferredAirline: /delta/i.test(query)
        ? "Delta"
        : /american/i.test(query)
          ? "American"
          : /united/i.test(query)
            ? "United"
            : undefined,
      proximityPreferred: /close|near|venue/i.test(query),
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
    // Scripted demo prompt stays deterministic for the presentation path.
    if (isVegasDemoQuery(query)) {
      return vegasDemoParse(query);
    }

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
                "Parse travel requests to JSON with originAirport, destinationCity, destinationAirport, startDate, endDate, purpose, venueName, preferredAirline, preferredHotelBrand, preferredCabin (economy|premium_economy|business), proximityPreferred, maxFlightCents, maxHotelNightlyCents, maxTotalCents. Dates ISO YYYY-MM-DD. Year 2026 unless the user specifies another year. Money fields are integer cents ($300 → 30000). Omit unknown fields. Do NOT invent Las Vegas / MongoDB.local unless the user asked for that.",
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
      return {
        ...parsed,
        ...normalizeMoneyPatch(parsed),
        proximityPreferred: Boolean(parsed.proximityPreferred),
        rawQuery: query,
      };
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
        return reviseParsedTrip(current, message);
      }
      const next = applyTripPatch(current, patch, message);
      return {
        parsed: next,
        reply: parsedJson.reply?.trim() || `Updated ${keys.join(", ")}.`,
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

function openAiAdapterOrDemo(): LlmAdapter {
  const key = process.env.OPENAI_API_KEY;
  const base = process.env.OPENAI_BASE_URL;
  if (key && base) return new OpenAiCompatibleAdapter(base, key);
  return new DemoLlmAdapter();
}

/**
 * Prefer live LLM when keys exist so free-form prompts are not forced to Vegas.
 * Scripted MongoDB.local Vegas queries stay deterministic inside the OpenAI adapter.
 */
export function getLlmAdapter(): LlmAdapter {
  return openAiAdapterOrDemo();
}

/** Same as getLlmAdapter — revisions always use LLM when available. */
export function getReviseLlmAdapter(): LlmAdapter {
  return openAiAdapterOrDemo();
}
