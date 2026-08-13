import type {
  FlightOffer,
  ParsedTripRequest,
  PolicyCheckResult,
  TravelPolicy,
  TravelPolicyRules,
} from "@/types";
import { dollarsToCents } from "@/lib/money";
import { formatUsd } from "@/lib/money";

/** Normalize "Las Vegas, NV" / "Vegas" → cityCaps key. */
export function normalizeCityKey(city: string): string {
  const raw = city.toLowerCase().trim();
  const aliases: Record<string, string> = {
    vegas: "las vegas",
    lasvegas: "las vegas",
    "las vegas nv": "las vegas",
    nyc: "new york",
    "new york city": "new york",
    "new york ny": "new york",
    sf: "san francisco",
    "san francisco ca": "san francisco",
    "washington dc": "washington",
    "washington d.c.": "washington",
    "washington, dc": "washington",
    "long beach ca": "long beach",
    "los angeles ca": "los angeles",
    "seattle wa": "seattle",
  };
  if (aliases[raw]) return aliases[raw]!;
  const noState = raw.replace(/,?\s*(ca|ny|nv|wa|dc|d\.c\.)\s*$/i, "").trim();
  return aliases[noState] ?? noState;
}

export function hotelMaxForCity(
  rules: TravelPolicyRules,
  city: string,
  isConference: boolean,
): number {
  const key = normalizeCityKey(city);
  let base =
    rules.hotels.cityCapsCents[key] ?? rules.hotels.standardMaxCents;
  if (isConference) {
    base = Math.round(base * (1 + rules.hotels.conferenceExceedPercent / 100));
  }
  return base;
}

export function validateItinerary(input: {
  policy: TravelPolicy;
  parsed: ParsedTripRequest;
  flight: FlightOffer;
  hotelNightlyCents: number;
  hotelDistanceMiles: number;
  totalCents: number;
  nights: number;
}): PolicyCheckResult {
  const { policy, parsed, flight, hotelNightlyCents, hotelDistanceMiles, totalCents, nights } =
    input;
  const rules = policy.rules;
  const reasons: string[] = [];
  let status: PolicyCheckResult["status"] = "compliant";

  const isConference = Boolean(parsed.venueName) || /conference|mongodb\.local/i.test(parsed.purpose);
  const hotelMaxCents = hotelMaxForCity(
    rules,
    parsed.destinationCity,
    isConference,
  );

  const hours = flight.durationMinutes / 60;
  if (hours < rules.flights.economyUnderHours && flight.cabin !== "economy") {
    reasons.push(
      `Economy fare required for flights under ${rules.flights.economyUnderHours} hours`,
    );
    status = "out_of_policy";
  }

  if (flight.cabin === "business" && rules.flights.businessRequiresVpApproval) {
    reasons.push("Business class requires VP approval");
    status = status === "out_of_policy" ? "out_of_policy" : "exception";
  }

  if (hotelNightlyCents > hotelMaxCents) {
    reasons.push(
      `Hotel rate exceeds policy max of $${(hotelMaxCents / 100).toFixed(0)}/night`,
    );
    status = "out_of_policy";
  }

  if (
    isConference &&
    hotelDistanceMiles > rules.hotels.conferenceRadiusMiles
  ) {
    reasons.push(
      `Hotel is outside ${rules.hotels.conferenceRadiusMiles} mile conference radius`,
    );
    if (status === "compliant") status = "exception";
  }

  const requiresManagerApproval =
    totalCents > rules.approval.managerApprovalAboveCents;

  if (requiresManagerApproval) {
    reasons.push(
      `Trip above ${formatUsd(rules.approval.managerApprovalAboveCents)} requires manager approval`,
    );
    if (status === "compliant") status = "exception";
  }

  if (status === "compliant") {
    reasons.push("Within travel policy");
  }

  const flightAllowance = flight.cabin === "economy" ? dollarsToCents(400) : dollarsToCents(600);
  const hotelAllowance = hotelMaxCents * nights;
  const allowanceCents = flightAllowance + hotelAllowance;

  return {
    compliant: status === "compliant",
    status,
    reasons,
    hotelMaxCents,
    conferenceRadiusMiles: rules.hotels.conferenceRadiusMiles,
    allowanceCents,
    requiresManagerApproval,
  };
}

/** Fixed Vegas demo allowance from spec: $1,280 */
export const VEGAS_DEMO_ALLOWANCE_CENTS = dollarsToCents(1280);
