import type {
  FlightOffer,
  ParsedTripRequest,
  PolicyCheckResult,
  TravelPolicy,
  TravelPolicyRules,
} from "@/types";
import { dollarsToCents } from "@/lib/money";

export function hotelMaxForCity(
  rules: TravelPolicyRules,
  city: string,
  isConference: boolean,
): number {
  const key = city.toLowerCase();
  let base =
    rules.hotels.cityCapsCents[key] ?? rules.hotels.standardMaxCents;
  // Spec lists SF standard $250 but also SF $325 — seed uses cityCaps.
  // Conference travel may exceed normal limit by conferenceExceedPercent.
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

  // Economy required under 6 hours
  const hours = flight.durationMinutes / 60;
  if (hours < rules.flights.economyUnderHours && flight.cabin !== "economy") {
    reasons.push("Economy fare required for flights under 6 hours");
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
    reasons.push("Trip above $2,500 requires manager approval");
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
