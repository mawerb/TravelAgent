import type { ParsedTripRequest } from "@/types";
import { DEMO_EMPLOYEE } from "@/lib/session";

export interface LlmAdapter {
  parseTripRequest(query: string): Promise<ParsedTripRequest>;
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
      // Deterministic parse for the scripted demo (and fallback in DEMO_MODE)
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

    // Minimal heuristic fallback for other chips
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

  async explainRecommendation(input: {
    hotelName: string;
    distanceMiles: number;
    hotelMaxCents: number;
    brand: string;
  }): Promise<string> {
    return `Based on your previous trips, you consistently prioritize proximity over small price differences. This hotel is ${input.distanceMiles.toFixed(1)} miles from the venue, is within Acme's $${(input.hotelMaxCents / 100).toFixed(0)}/night hotel limit, and matches your preference for ${input.brand} properties.`;
  }
}

export class OpenAiCompatibleAdapter implements LlmAdapter {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  async parseTripRequest(query: string): Promise<ParsedTripRequest> {
    // ponytail: live LLM parse is optional; fall back to demo adapter on any failure.
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
                "Parse travel requests to JSON with originAirport, destinationCity, destinationAirport, startDate, endDate, purpose, venueName, preferredAirline, proximityPreferred. Dates ISO YYYY-MM-DD. Year 2026.",
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
      const parsed = JSON.parse(data.choices[0]!.message.content) as ParsedTripRequest;
      return { ...parsed, rawQuery: query };
    } catch {
      return new DemoLlmAdapter().parseTripRequest(query);
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
  const key = process.env.OPENAI_API_KEY;
  const base = process.env.OPENAI_BASE_URL;
  if (key && base) return new OpenAiCompatibleAdapter(base, key);
  return new DemoLlmAdapter();
}
