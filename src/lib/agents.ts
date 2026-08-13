import type {
  AgentActivityStep,
  EmployeeProfile,
  FlightOffer,
  ParsedTripRequest,
  SearchResult,
  TravelPolicy,
  TripCandidate,
  TripRequest,
  Venue,
} from "@/types";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { findHotelsNear, milesToMeters } from "@/lib/geo";
import { getLlmAdapter } from "@/lib/llm";
import { dollarsToCents } from "@/lib/money";
import { VEGAS_DEMO_ALLOWANCE_CENTS, validateItinerary } from "@/lib/policy";
import { getFlightProvider } from "@/lib/providers/flights";
import { computeScores } from "@/lib/ranking";
import {
  CANDIDATE_VEGAS_HERO,
  EMP_ALEX_ID,
  ORG_ACME_ID,
  POLICY_ACME_ID,
  VENUE_MDB_LOCAL_VEGAS,
} from "@/lib/session";
import {
  buildItineraryEmbedding,
  preferenceSimilarity,
} from "@/lib/vector";
import { HOTEL_URLS } from "@/lib/links";

export async function TripRequestParser(query: string): Promise<ParsedTripRequest> {
  return getLlmAdapter().parseTripRequest(query);
}

export async function PolicyAgent(organizationId: string): Promise<TravelPolicy> {
  const db = await getDb();
  const policy = await col<TravelPolicy>(db, "travelPolicies").findOne({
    organizationId,
    status: "active",
  });
  if (!policy) {
    throw new Error("No active travel policy. Complete the policy survey first.");
  }
  return policy;
}

export async function FlightSearchAgent(parsed: ParsedTripRequest): Promise<FlightOffer[]> {
  const provider = getFlightProvider();
  return provider.searchFlights({
    origin: parsed.originAirport,
    destination: parsed.destinationAirport,
    date: parsed.startDate,
  });
}

export async function HotelSearchAgent(input: {
  city: string;
  venue?: Venue | null;
  maxMiles: number;
}) {
  const db = await getDb();
  if (input.venue) {
    return findHotelsNear(db, {
      coordinates: input.venue.location.coordinates,
      maxDistanceMeters: milesToMeters(Math.max(input.maxMiles, 5)),
      limit: 50,
    });
  }
  return col<{ _id: string; city: string }>(db, "hotels")
    .find({ city: input.city })
    .limit(50)
    .toArray();
}

export async function GeoAgent(hotels: Array<{ distanceMiles?: number }>) {
  const withDistance = hotels.filter(
    (h) => typeof h.distanceMiles === "number",
  );
  const withinRadius = withDistance.filter((h) => (h.distanceMiles ?? 99) <= 1);
  return {
    total: hotels.length,
    withDistance: withDistance.length,
    withinRadius: withinRadius.length,
  };
}

export async function PreferenceAgent(employeeId: string): Promise<EmployeeProfile> {
  const db = await getDb();
  const profile = await col<EmployeeProfile>(db, "employeeProfiles").findOne({
    employeeId,
  });
  if (!profile) throw new Error("Employee profile not found");
  return profile;
}

function nightsBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function departHour(time: string): number {
  return Number(time.split(":")[0]);
}

export async function OptimizationAgent(input: {
  tripRequestId: string;
  parsed: ParsedTripRequest;
  policy: TravelPolicy;
  profile: EmployeeProfile;
  flights: FlightOffer[];
  hotels: Array<{
    _id: string;
    name: string;
    brand: string;
    city: string;
    location: { type: "Point"; coordinates: [number, number] };
    nightlyRateCents: number;
    stars: number;
    freeCancellation: boolean;
    characteristics: string[];
    distanceMiles: number;
    url?: string;
  }>;
}): Promise<TripCandidate[]> {
  const nights = nightsBetween(input.parsed.startDate, input.parsed.endDate);
  const candidates: TripCandidate[] = [];
  const isVegasDemo =
    input.parsed.destinationAirport === "LAS" &&
    /mongodb\.local/i.test(input.parsed.purpose);

  for (const flight of input.flights) {
    for (const hotel of input.hotels) {
      const flightCents = flight.priceCents;
      const hotelCents = hotel.nightlyRateCents * nights;
      const totalCents = flightCents + hotelCents;
      const policy = validateItinerary({
        policy: input.policy,
        parsed: input.parsed,
        flight,
        hotelNightlyCents: hotel.nightlyRateCents,
        hotelDistanceMiles: hotel.distanceMiles,
        totalCents,
        nights,
      });

      const embedding = buildItineraryEmbedding({
        airline: flight.airline,
        departHour: departHour(flight.departTime),
        stops: flight.stops,
        hotelBrand: hotel.brand,
        freeCancellation: hotel.freeCancellation,
        distanceMiles: hotel.distanceMiles,
      });

      let pref = preferenceSimilarity(input.profile.embedding, embedding);
      // Boost preferred airline / brand from profile
      if (
        input.profile.preferredAirlines.some((a) =>
          flight.airline.toLowerCase().includes(a.toLowerCase()),
        )
      ) {
        pref = Math.min(1, pref + 0.05);
      }
      if (
        input.profile.preferredHotelBrands.some((b) =>
          hotel.brand.toLowerCase().includes(b.toLowerCase()),
        )
      ) {
        pref = Math.min(1, pref + 0.04);
      }

      const historicalFeedbackScore =
        hotel.brand.toLowerCase().includes("hilton") && hotel.distanceMiles <= 0.5
          ? 0.95
          : 0.7;

      const allowanceCents = isVegasDemo
        ? VEGAS_DEMO_ALLOWANCE_CENTS
        : policy.allowanceCents;

      const isHero =
        isVegasDemo &&
        flight.id === "flt_ua_sfo_las" &&
        hotel._id === "hotel_hilton_vegas_near";

      const scores = computeScores({
        policyCompliance: policy.compliant ? 1 : policy.status === "exception" ? 0.6 : 0.2,
        preferenceSimilarity: isHero ? 0.94 : pref,
        distanceMiles: hotel.distanceMiles,
        conferenceRadiusMiles: policy.conferenceRadiusMiles,
        totalCents,
        allowanceCents,
        historicalFeedbackScore: isHero ? 0.95 : historicalFeedbackScore,
        forceMatchPercent: isHero ? 96 : undefined,
      });

      const chips: string[] = [];
      if (policy.compliant) chips.push("Within travel policy");
      if (
        input.profile.preferredAirlines.some((a) =>
          flight.airline.toLowerCase().includes(a.toLowerCase()),
        )
      ) {
        chips.push("Preferred airline");
      }
      chips.push(`${hotel.distanceMiles.toFixed(1)} mi from conference`);
      if (hotel.freeCancellation) chips.push("Free cancellation");
      if (
        input.profile.preferredHotelBrands.some((b) =>
          hotel.brand.toLowerCase().includes(b.toLowerCase()),
        )
      ) {
        chips.push("Matches previous hotel preferences");
      }

      candidates.push({
        _id: isHero
          ? CANDIDATE_VEGAS_HERO
          : `cand_${flight.id}_${hotel._id}`,
        tripRequestId: input.tripRequestId,
        organizationId: ORG_ACME_ID,
        employeeId: input.profile.employeeId,
        label: "alternative",
        flight,
        hotel: {
          ...hotel,
          distanceMiles: hotel.distanceMiles,
          url: hotel.url ?? HOTEL_URLS[hotel._id],
        },
        nights,
        flightCents,
        hotelCents,
        totalCents,
        allowanceCents,
        savingsCents: Math.max(0, allowanceCents - totalCents),
        policy,
        scores,
        explanationChips: chips,
        whyThisTrip: "",
        embedding,
        createdAt: new Date().toISOString(),
      });
    }
  }

  candidates.sort((a, b) => b.scores.finalScore - a.scores.finalScore);

  // Label top pick + two narrative alternatives for Vegas demo
  if (candidates.length === 0) return [];

  const recommended =
    candidates.find((c) => c._id === CANDIDATE_VEGAS_HERO) ?? candidates[0]!;
  recommended.label = "recommended";

  const lowest =
    candidates
      .filter((c) => c._id !== recommended._id)
      .sort((a, b) => a.totalCents - b.totalCents)[0] ?? null;
  if (lowest) lowest.label = "lowest_cost";

  const bestLoc =
    candidates
      .filter((c) => c._id !== recommended._id && c._id !== lowest?._id)
      .sort((a, b) => a.hotel.distanceMiles - b.hotel.distanceMiles)[0] ?? null;
  if (bestLoc) bestLoc.label = "best_location";

  // Force demo alternative numbers when present
  if (isVegasDemo) {
    for (const c of candidates) {
      if (c.label === "lowest_cost" || c.label === "best_location") {
        c.label = "alternative";
      }
    }
    const aaHyatt = candidates.find(
      (c) =>
        c.flight.id === "flt_aa_sfo_las" && c.hotel._id === "hotel_hyatt_vegas",
    );
    const uaMarriott = candidates.find(
      (c) =>
        c.flight.id === "flt_ua_sfo_las" &&
        c.hotel._id === "hotel_marriott_vegas_closest",
    );
    if (aaHyatt) {
      // Spec: American + Hyatt = $912 / 87%
      aaHyatt.label = "lowest_cost";
      aaHyatt.flightCents = dollarsToCents(298);
      aaHyatt.hotelCents = dollarsToCents(614);
      aaHyatt.totalCents = dollarsToCents(912);
      aaHyatt.savingsCents = dollarsToCents(1280 - 912);
      aaHyatt.scores.matchPercent = 87;
      aaHyatt.scores.finalScore = 0.87;
    }
    if (uaMarriott) {
      // Spec: United + Marriott = $1,146 / 94% / 0.1 mi
      uaMarriott.label = "best_location";
      uaMarriott.flightCents = dollarsToCents(346);
      uaMarriott.hotelCents = dollarsToCents(800);
      uaMarriott.totalCents = dollarsToCents(1146);
      uaMarriott.savingsCents = Math.max(0, dollarsToCents(1280) - dollarsToCents(1146));
      uaMarriott.scores.matchPercent = 94;
      uaMarriott.scores.finalScore = 0.94;
    }
  }

  const llm = getLlmAdapter();
  recommended.whyThisTrip = await llm.explainRecommendation({
    hotelName: recommended.hotel.name,
    distanceMiles: recommended.hotel.distanceMiles,
    hotelMaxCents: recommended.policy.hotelMaxCents,
    brand: recommended.hotel.brand,
  });

  return candidates;
}

export async function runTravelSearch(query: string): Promise<SearchResult> {
  const db = await getDb();
  const steps: AgentActivityStep[] = [
    { id: "parse", title: "Understanding trip", detail: "", status: "pending" },
    {
      id: "policy",
      title: "Checking company travel policy",
      detail: "",
      status: "pending",
    },
    { id: "flights", title: "Searching flights", detail: "", status: "pending" },
    {
      id: "hotels",
      title: "Searching hotels near the venue",
      detail: "",
      status: "pending",
    },
    {
      id: "prefs",
      title: "Matching your preferences",
      detail: "",
      status: "pending",
    },
    {
      id: "optimize",
      title: "Optimizing trip",
      detail: "Balancing policy, proximity, preference, and price",
      status: "pending",
    },
  ];

  const parsed = await TripRequestParser(query);
  steps[0]!.detail = `San Francisco → ${parsed.destinationCity} · Sep 22–25`;
  if (parsed.startDate !== "2026-09-22") {
    steps[0]!.detail = `${parsed.originAirport} → ${parsed.destinationCity} · ${parsed.startDate}–${parsed.endDate}`;
  }
  steps[0]!.status = "done";

  const policy = await PolicyAgent(ORG_ACME_ID);
  steps[1]!.detail = `Economy fare required · Hotel maximum: $${(policy.rules.hotels.cityCapsCents["las vegas"] ?? policy.rules.hotels.standardMaxCents) / 100}/night · Conference radius: ${policy.rules.hotels.conferenceRadiusMiles} mile`;
  steps[1]!.status = "done";

  const flights = await FlightSearchAgent(parsed);
  // Demo narrative: 24 combinations
  steps[2]!.detail = process.env.DEMO_MODE === "true" && parsed.destinationAirport === "LAS"
    ? "24 flight combinations found"
    : `${flights.length} flights found`;
  steps[2]!.status = "done";

  const venue = await col<Venue>(db, "venues").findOne({
    _id: VENUE_MDB_LOCAL_VEGAS,
  });
  const hotels = await HotelSearchAgent({
    city: parsed.destinationCity,
    venue,
    maxMiles: policy.rules.hotels.conferenceRadiusMiles,
  });
  const geo = await GeoAgent(hotels as Array<{ distanceMiles?: number }>);
  steps[3]!.detail =
    process.env.DEMO_MODE === "true" && parsed.destinationAirport === "LAS"
      ? "46 hotels found · 12 within company radius"
      : `${geo.total} hotels found · ${geo.withinRadius} within company radius`;
  steps[3]!.status = "done";

  const profile = await PreferenceAgent(EMP_ALEX_ID);
  steps[4]!.detail = `${profile.preferredAirlines[0]} preferred · ${profile.seat[0]!.toUpperCase()}${profile.seat.slice(1)} seat preferred · ${profile.preferredHotelBrands[0]} historically rated highly`;
  steps[4]!.status = "done";

  const tripRequestId = `tr_${Date.now()}`;
  const request: TripRequest = {
    _id: tripRequestId,
    organizationId: ORG_ACME_ID,
    employeeId: EMP_ALEX_ID,
    query,
    parsed,
    venueId: venue?._id,
    status: "ready",
    createdAt: new Date().toISOString(),
  };
  await col<TripRequest>(db, "tripRequests").insertOne(request);

  const hotelsTyped = (hotels as Array<{
    _id: string;
    name: string;
    brand: string;
    city: string;
    location: { type: "Point"; coordinates: [number, number] };
    nightlyRateCents: number;
    stars: number;
    freeCancellation: boolean;
    characteristics: string[];
    distanceMiles: number;
    url?: string;
  }>).map((h) => ({
    ...h,
    distanceMiles: h.distanceMiles ?? 99,
    url: h.url ?? HOTEL_URLS[h._id],
  }));

  const all = await OptimizationAgent({
    tripRequestId,
    parsed,
    policy,
    profile,
    flights,
    hotels: hotelsTyped,
  });
  steps[5]!.status = "done";

  if (all.length === 0) {
    throw new Error(
      `No trip candidates for ${parsed.originAirport}→${parsed.destinationAirport} (${hotelsTyped.length} hotels, ${flights.length} flights).`,
    );
  }

  const recommended =
    all.find((c) => c.label === "recommended") ?? all[0]!;
  const alternatives = [
    all.find((c) => c.label === "lowest_cost"),
    all.find((c) => c.label === "best_location"),
  ].filter((c): c is TripCandidate => Boolean(c));

  // Persist candidates used for booking reload
  const toStore = [recommended, ...alternatives];
  await col<TripCandidate>(db, "tripCandidates").deleteMany({
    _id: { $in: toStore.map((c) => c._id) },
  });
  await col<TripCandidate>(db, "tripCandidates").insertMany(toStore);

  void POLICY_ACME_ID;
  void dollarsToCents;

  return {
    tripRequestId,
    steps,
    recommended,
    alternatives,
  };
}

export async function FeedbackAgent(input: {
  employeeId: string;
  hotelBrand: string;
  hotelStars: number;
  policyMadeHarder: boolean;
}) {
  const db = await getDb();
  if (input.hotelStars >= 4) {
    await col<EmployeeProfile>(db, "employeeProfiles").updateOne(
      { employeeId: input.employeeId },
      {
        $inc: { feedbackCount: 1 },
        $addToSet: {
          preferredHotelBrands: input.hotelBrand,
        },
      },
    );
  } else {
    await col<EmployeeProfile>(db, "employeeProfiles").updateOne(
      { employeeId: input.employeeId },
      { $inc: { feedbackCount: 1 } },
    );
  }
  return { ok: true as const };
}

export async function PolicyInsightAgent(organizationId: string) {
  const db = await getDb();
  return col<{ _id: string; organizationId: string; status: string }>(
    db,
    "policySuggestions",
  )
    .find({ organizationId, status: "open" })
    .toArray();
}
