import type {
  AgentActivityStep,
  EmployeeProfile,
  FlightOffer,
  HotelRoom,
  ParsedTripRequest,
  PolicySuggestion,
  SearchResult,
  TravelPolicy,
  TripCandidate,
  TripRequest,
  Venue,
} from "@/types";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { getFlightsWithCache, getHotelsWithCache } from "@/lib/inventory/cache";
import { getLlmAdapter } from "@/lib/llm";
import { dollarsToCents, formatUsd } from "@/lib/money";
import {
  normalizeCityKey,
  VEGAS_DEMO_ALLOWANCE_CENTS,
  validateItinerary,
} from "@/lib/policy";
import { computeScores } from "@/lib/ranking";
import {
  CANDIDATE_VEGAS_HERO,
  getDemoSession,
  VENUE_MDB_LOCAL_VEGAS,
} from "@/lib/session";
import {
  buildItineraryEmbedding,
  preferenceSimilarity,
} from "@/lib/vector";
import { compareBookingSites } from "@/lib/booking-sites";
import { hotelListingUrl, hotelRatesUrl, withFlightUrl } from "@/lib/links";
import { HOTEL_DETAILS } from "@/lib/hotel-details";
import {
  hasUserSearchOverrides,
  formatRouteLabel,
  explainEmptySearch,
  describePreferenceCaps,
} from "@/lib/clarify";

function enrichHotel(
  hotel: {
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
    amenities?: string[];
    address?: string;
    neighborhood?: string;
    room?: HotelRoom;
    listingUrl?: string;
    url?: string;
  },
  checkIn: string,
  checkOut: string,
) {
  const details = HOTEL_DETAILS[hotel._id];
  const room =
    hotel.room ??
    details?.room ??
    ({
      name: "Standard King",
      bedType: "1 King bed",
      sleeps: 2,
      refundable: hotel.freeCancellation,
      breakfastIncluded: false,
    } satisfies HotelRoom);

  return {
    ...hotel,
    distanceMiles: hotel.distanceMiles ?? 99,
    amenities: hotel.amenities?.length
      ? hotel.amenities
      : (details?.amenities ?? ["Free Wi‑Fi"]),
    address: hotel.address ?? details?.address,
    neighborhood: hotel.neighborhood ?? details?.neighborhood,
    room,
    listingUrl: hotelListingUrl({
      hotelId: hotel._id,
      name: hotel.name,
      city: hotel.city,
    }),
    /** Dated rates — secondary; listingUrl is the shareable durable link */
    url: hotelRatesUrl({
      hotelId: hotel._id,
      name: hotel.name,
      city: hotel.city,
      checkIn,
      checkOut,
    }),
  };
}

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

export async function FlightSearchAgent(parsed: ParsedTripRequest) {
  const db = await getDb();
  return getFlightsWithCache(db, {
    origin: parsed.originAirport,
    destination: parsed.destinationAirport,
    date: parsed.startDate,
    returnDate: parsed.endDate,
  });
}

export async function HotelSearchAgent(input: {
  city: string;
  venue?: Venue | null;
  maxMiles: number;
}) {
  const db = await getDb();
  return getHotelsWithCache(db, {
    city: input.city,
    venueCoordinates: input.venue?.location.coordinates,
    maxMiles: Math.max(input.maxMiles, 5),
  });
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

function buildFilteredCandidates(input: {
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
    amenities?: string[];
    address?: string;
    neighborhood?: string;
    room?: HotelRoom;
    listingUrl?: string;
    url?: string;
  }>;
}): TripCandidate[] {
  const nights = nightsBetween(input.parsed.startDate, input.parsed.endDate);
  const candidates: TripCandidate[] = [];
  const userOverrides = hasUserSearchOverrides(input.parsed);
  const isVegasDemo =
    input.parsed.destinationAirport === "LAS" &&
    /mongodb\.local/i.test(input.parsed.purpose) &&
    !userOverrides;

  for (const flight of input.flights) {
    for (const hotel of input.hotels) {
      if (
        input.parsed.maxFlightCents != null &&
        flight.priceCents > input.parsed.maxFlightCents
      ) {
        continue;
      }
      if (
        input.parsed.maxHotelNightlyCents != null &&
        hotel.nightlyRateCents > input.parsed.maxHotelNightlyCents
      ) {
        continue;
      }
      if (
        input.parsed.preferredCabin &&
        flight.cabin !== input.parsed.preferredCabin
      ) {
        continue;
      }

      const flightCents = flight.priceCents;
      const hotelCents = hotel.nightlyRateCents * nights;
      const totalCents = flightCents + hotelCents;
      if (
        input.parsed.maxTotalCents != null &&
        totalCents > input.parsed.maxTotalCents
      ) {
        continue;
      }
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
      if (
        input.profile.preferredAirlines.some((a) =>
          flight.airline.toLowerCase().includes(a.toLowerCase()),
        )
      ) {
        pref = Math.min(1, pref + 0.05);
      }
      if (
        input.parsed.preferredAirline &&
        flight.airline
          .toLowerCase()
          .includes(input.parsed.preferredAirline.toLowerCase())
      ) {
        pref = Math.min(1, pref + 0.15);
      }
      if (
        input.profile.preferredHotelBrands.some((b) =>
          hotel.brand.toLowerCase().includes(b.toLowerCase()),
        )
      ) {
        pref = Math.min(1, pref + 0.04);
      }
      if (
        input.parsed.preferredHotelBrand &&
        hotel.brand
          .toLowerCase()
          .includes(input.parsed.preferredHotelBrand.toLowerCase())
      ) {
        pref = Math.min(1, pref + 0.12);
      }
      if (!input.parsed.proximityPreferred) {
        // User said distance is flexible — don't overweight proximity via pref
        pref = Math.min(1, pref + 0.02);
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
        conferenceRadiusMiles: input.parsed.proximityPreferred
          ? policy.conferenceRadiusMiles
          : Math.max(policy.conferenceRadiusMiles, 5),
        totalCents,
        allowanceCents,
        historicalFeedbackScore: isHero ? 0.95 : historicalFeedbackScore,
        forceMatchPercent: isHero ? 96 : undefined,
      });

      const chips: string[] = [];
      if (policy.compliant) chips.push("Within travel policy");
      if (
        input.parsed.preferredAirline &&
        flight.airline
          .toLowerCase()
          .includes(input.parsed.preferredAirline.toLowerCase())
      ) {
        chips.push(`Matches ${input.parsed.preferredAirline}`);
      } else if (
        input.profile.preferredAirlines.some((a) =>
          flight.airline.toLowerCase().includes(a.toLowerCase()),
        )
      ) {
        chips.push("Preferred airline");
      }
      chips.push(`${hotel.distanceMiles.toFixed(1)} mi from conference`);
      if (hotel.freeCancellation || hotel.room?.refundable) {
        chips.push("Free cancellation");
      }
      if (hotel.room?.breakfastIncluded) chips.push("Breakfast included");
      if (hotel.room) chips.push(hotel.room.name);
      if (
        input.parsed.preferredHotelBrand &&
        hotel.brand
          .toLowerCase()
          .includes(input.parsed.preferredHotelBrand.toLowerCase())
      ) {
        chips.push(`${input.parsed.preferredHotelBrand} brand`);
      } else if (
        input.profile.preferredHotelBrands.some((b) =>
          hotel.brand.toLowerCase().includes(b.toLowerCase()),
        )
      ) {
        chips.push("Matches previous hotel preferences");
      }
      if (input.parsed.maxFlightCents != null) {
        chips.push(`Flight ≤ ${formatUsd(input.parsed.maxFlightCents)}`);
      }
      if (input.parsed.maxHotelNightlyCents != null) {
        chips.push(
          `Hotel ≤ ${formatUsd(input.parsed.maxHotelNightlyCents)}/night`,
        );
      }
      if (input.parsed.maxTotalCents != null) {
        chips.push(`Total ≤ ${formatUsd(input.parsed.maxTotalCents)}`);
      }

      const enriched = enrichHotel(hotel, input.parsed.startDate, input.parsed.endDate);
      const bookingCompare = compareBookingSites({
        origin: flight.origin,
        destination: flight.destination,
        date: input.parsed.startDate,
        returnDate: input.parsed.endDate,
        airline: flight.airline,
        flightCents,
        hotelName: enriched.name,
        hotelCity: enriched.city,
        checkIn: input.parsed.startDate,
        checkOut: input.parsed.endDate,
        hotelCents,
        hotelBrandUrl: enriched.url,
      });
      const flightWithUrl = withFlightUrl(
        flight,
        input.parsed.startDate,
        input.parsed.endDate,
      );
      // Prefer cheapest shareable OTA link as the primary flight/hotel URL
      if (bookingCompare.cheapestFlight) {
        flightWithUrl.url = bookingCompare.cheapestFlight.url;
      }
      if (bookingCompare.cheapestHotel) {
        enriched.url = bookingCompare.cheapestHotel.url;
      }

      candidates.push({
        _id: isHero
          ? `${CANDIDATE_VEGAS_HERO}_${input.profile.organizationId}`
          : `cand_${flight.id}_${hotel._id}_${input.profile.organizationId}`,
        tripRequestId: input.tripRequestId,
        organizationId: input.profile.organizationId,
        employeeId: input.profile.employeeId,
        label: "alternative",
        flight: flightWithUrl,
        hotel: enriched,
        nights,
        startDate: input.parsed.startDate,
        endDate: input.parsed.endDate,
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
        bookingCompare,
      });
    }
  }

  candidates.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
  return candidates;
}

function relaxParsed(
  parsed: ParsedTripRequest,
  drop: "preferredCabin" | "maxFlightCents" | "maxHotelNightlyCents" | "maxTotalCents",
): ParsedTripRequest {
  const next = { ...parsed };
  delete next[drop];
  return next;
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
    amenities?: string[];
    address?: string;
    neighborhood?: string;
    room?: HotelRoom;
    listingUrl?: string;
    url?: string;
  }>;
}): Promise<{ candidates: TripCandidate[]; preferenceNote?: string }> {
  let filterParsed = input.parsed;
  let candidates = buildFilteredCandidates({ ...input, parsed: filterParsed });
  let preferenceNote: string | undefined;

  if (candidates.length === 0 && describePreferenceCaps(input.parsed).length > 0) {
    const order = [
      "preferredCabin",
      "maxFlightCents",
      "maxHotelNightlyCents",
      "maxTotalCents",
    ] as const;
    for (const key of order) {
      if (input.parsed[key] == null && filterParsed[key] == null) continue;
      if (filterParsed[key] == null) continue;
      const before = describePreferenceCaps(filterParsed);
      filterParsed = relaxParsed(filterParsed, key);
      candidates = buildFilteredCandidates({ ...input, parsed: filterParsed });
      if (candidates.length > 0) {
        const dropped = before.find(
          (h) => !describePreferenceCaps(filterParsed).includes(h),
        );
        preferenceNote = dropped
          ? `No trips matched your ${dropped} preference. Showing results with that limit relaxed.`
          : "No trips matched your hard preferences. Showing the closest options with looser filters.";
        break;
      }
    }
  }

  if (candidates.length === 0 && describePreferenceCaps(input.parsed).length > 0) {
    filterParsed = {
      ...input.parsed,
      preferredCabin: undefined,
      maxFlightCents: undefined,
      maxHotelNightlyCents: undefined,
      maxTotalCents: undefined,
    };
    candidates = buildFilteredCandidates({ ...input, parsed: filterParsed });
    if (candidates.length > 0) {
      preferenceNote = `No trips matched ${describePreferenceCaps(input.parsed).join(", ")}. Showing in-policy options without those caps.`;
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      explainEmptySearch({
        parsed: input.parsed,
        flightCount: input.flights.length,
        hotelCount: input.hotels.length,
      }),
    );
  }

  const userOverrides = hasUserSearchOverrides(input.parsed);
  const isVegasDemo =
    input.parsed.destinationAirport === "LAS" &&
    /mongodb\.local/i.test(input.parsed.purpose) &&
    !userOverrides;

  // Prefer user-stated airline/brand when choosing the hero recommendation
  const preferred =
    candidates.find((c) => {
      const airOk =
        !input.parsed.preferredAirline ||
        c.flight.airline
          .toLowerCase()
          .includes(input.parsed.preferredAirline.toLowerCase());
      const brandOk =
        !input.parsed.preferredHotelBrand ||
        c.hotel.brand
          .toLowerCase()
          .includes(input.parsed.preferredHotelBrand.toLowerCase());
      return airOk && brandOk;
    }) ?? candidates[0]!;

  const recommended =
    (!userOverrides &&
      candidates.find(
        (c) =>
          c._id === `${CANDIDATE_VEGAS_HERO}_${input.profile.organizationId}`,
      )) ||
    preferred;
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
      aaHyatt.label = "lowest_cost";
      aaHyatt.flightCents = dollarsToCents(298);
      aaHyatt.hotelCents = dollarsToCents(614);
      aaHyatt.totalCents = dollarsToCents(912);
      aaHyatt.savingsCents = dollarsToCents(1280 - 912);
      aaHyatt.scores.matchPercent = 87;
      aaHyatt.scores.finalScore = 0.87;
    }
    if (uaMarriott) {
      uaMarriott.label = "best_location";
      uaMarriott.flightCents = dollarsToCents(346);
      uaMarriott.hotelCents = dollarsToCents(800);
      uaMarriott.totalCents = dollarsToCents(1146);
      uaMarriott.savingsCents = Math.max(
        0,
        dollarsToCents(1280) - dollarsToCents(1146),
      );
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

  return { candidates, preferenceNote };
}

export async function runTravelSearch(
  query: string,
  parsedOverride?: ParsedTripRequest,
): Promise<SearchResult> {
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

  const session = await getDemoSession();
  const parsed =
    parsedOverride ?? (await TripRequestParser(query));
  steps[0]!.detail = `${formatRouteLabel(parsed)} · ${parsed.startDate}–${parsed.endDate}`;
  steps[0]!.status = "done";

  const policy = await PolicyAgent(session.organization._id);
  const cityKey = parsed.destinationCity.toLowerCase();
  const hotelCap =
    policy.rules.hotels.cityCapsCents[cityKey] ??
    policy.rules.hotels.standardMaxCents;
  steps[1]!.detail = `${session.organization.name} policy · Hotel max $${hotelCap / 100}/night · Conference radius: ${policy.rules.hotels.conferenceRadiusMiles} mi`;
  steps[1]!.status = "done";

  const flightHit = await FlightSearchAgent(parsed);
  const flights = flightHit.items;
  steps[2]!.detail = flightHit.detail;
  steps[2]!.status = "done";

  const isVegasTrip =
    parsed.destinationAirport === "LAS" ||
    /las\s*vegas/i.test(parsed.destinationCity) ||
    /mongodb\.local/i.test(parsed.purpose ?? "");
  const venue = isVegasTrip
    ? await col<Venue>(db, "venues").findOne({
        _id: VENUE_MDB_LOCAL_VEGAS,
      })
    : null;
  const hotelHit = await HotelSearchAgent({
    city: parsed.destinationCity,
    venue,
    maxMiles: policy.rules.hotels.conferenceRadiusMiles,
  });
  const hotels = hotelHit.items;
  const geo = await GeoAgent(hotels as Array<{ distanceMiles?: number }>);
  steps[3]!.detail = `${hotelHit.detail} · ${geo.withinRadius} within company radius`;
  steps[3]!.status = "done";

  if (flights.length === 0 || hotels.length === 0) {
    throw new Error(
      explainEmptySearch({
        parsed,
        flightCount: flights.length,
        hotelCount: hotels.length,
      }),
    );
  }

  const profile = await PreferenceAgent(session.employee._id);
  steps[4]!.detail = `${profile.preferredAirlines[0]} preferred · ${profile.seat[0]!.toUpperCase()}${profile.seat.slice(1)} seat preferred · ${profile.preferredHotelBrands[0]} historically rated highly`;
  steps[4]!.status = "done";

  const tripRequestId = `tr_${Date.now()}`;
  const request: TripRequest = {
    _id: tripRequestId,
    organizationId: session.organization._id,
    employeeId: session.employee._id,
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
    amenities?: string[];
    address?: string;
    neighborhood?: string;
    room?: HotelRoom;
    listingUrl?: string;
    url?: string;
  }>).map((h) =>
    enrichHotel(
      { ...h, distanceMiles: h.distanceMiles ?? 99 },
      parsed.startDate,
      parsed.endDate,
    ),
  );

  const { candidates: all, preferenceNote } = await OptimizationAgent({
    tripRequestId,
    parsed,
    policy,
    profile,
    flights,
    hotels: hotelsTyped,
  });
  const compareSample =
    all.find((c) => c.label === "recommended") ?? all[0];
  steps[5]!.detail = compareSample?.bookingCompare
    ? `Compared ${compareSample.bookingCompare.sitesCompared} booking sites · cheapest flight ${compareSample.bookingCompare.cheapestFlight?.siteName ?? "—"} · cheapest hotel ${compareSample.bookingCompare.cheapestHotel?.siteName ?? "—"}`
    : "Balancing policy, proximity, preference, and price";
  steps[5]!.status = "done";
  if (preferenceNote) {
    steps[4]!.detail = preferenceNote;
  }

  if (all.length === 0) {
    throw new Error(
      explainEmptySearch({
        parsed,
        flightCount: flights.length,
        hotelCount: hotelsTyped.length,
      }),
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

  return {
    tripRequestId,
    steps,
    recommended,
    alternatives,
    preferenceNote,
  };
}

export async function FeedbackAgent(input: {
  employeeId: string;
  organizationId: string;
  feedbackId: string;
  hotelBrand: string;
  hotelStars: number;
  flightStars: number;
  policyMadeHarder: boolean;
  frictionNote?: string;
  destinationCity: string;
  nightlyRateCents?: number;
}) {
  const db = await getDb();
  const prefs: string[] = [];
  if (input.hotelStars >= 4) {
    prefs.push(`Likes ${input.hotelBrand} lodging`);
  } else if (input.hotelStars <= 2) {
    prefs.push(`Avoid ${input.hotelBrand} when possible`);
  }
  if (input.flightStars >= 4) {
    prefs.push("Values strong flight experience");
  }
  if (input.policyMadeHarder) {
    prefs.push(`Policy friction in ${input.destinationCity}`);
  }
  if (input.frictionNote?.trim()) {
    prefs.push(input.frictionNote.trim().slice(0, 120));
  }

  const profileUpdate: Record<string, unknown> = {
    $inc: { feedbackCount: 1 },
  };
  if (input.hotelStars >= 4) {
    profileUpdate.$addToSet = {
      preferredHotelBrands: input.hotelBrand,
      ...(prefs.length
        ? { inferredPreferences: { $each: prefs } }
        : {}),
    };
  } else if (prefs.length) {
    profileUpdate.$addToSet = {
      inferredPreferences: { $each: prefs },
    };
  }

  await col<EmployeeProfile>(db, "employeeProfiles").updateOne(
    { employeeId: input.employeeId },
    profileUpdate,
  );

  if (input.policyMadeHarder || input.frictionNote?.trim()) {
    await upsertPolicySuggestionFromFeedback(input);
  }

  return { ok: true as const };
}

async function upsertPolicySuggestionFromFeedback(input: {
  organizationId: string;
  feedbackId: string;
  destinationCity: string;
  frictionNote?: string;
  nightlyRateCents?: number;
  policyMadeHarder: boolean;
}) {
  const db = await getDb();
  const policy = await col<TravelPolicy>(db, "travelPolicies").findOne({
    organizationId: input.organizationId,
    status: "active",
  });
  if (!policy) return;

  const cityKey = normalizeCityKey(input.destinationCity);
  const currentCap =
    policy.rules.hotels.cityCapsCents[cityKey] ??
    policy.rules.hotels.standardMaxCents;
  const observed =
    input.nightlyRateCents && input.nightlyRateCents > 0
      ? input.nightlyRateCents
      : Math.round(currentCap * 1.15);
  const proposedCap = Math.max(observed, Math.round(currentCap * 1.1));
  const cityLabel = input.destinationCity.split(",")[0]!.trim();
  const id = `sug_fb_${input.organizationId}_${cityKey.replace(/\s+/g, "_")}`;
  const now = new Date().toISOString();

  const existing = await col<PolicySuggestion>(db, "policySuggestions").findOne({
    _id: id,
  });
  if (existing?.status === "applied" || existing?.status === "dismissed") {
    // New cycle after manager closed prior suggestion
  }

  const suggestion: PolicySuggestion = {
    _id: id,
    organizationId: input.organizationId,
    title: "Traveler feedback flagged policy friction",
    topic: `${cityLabel} lodging / trip policy`,
    currentPolicy: `${formatUsd(currentCap)}/night cap · radius ${policy.rules.hotels.conferenceRadiusMiles} mi`,
    tripsAnalyzed: (existing?.tripsAnalyzed ?? 0) + 1,
    exceptionRequests: (existing?.exceptionRequests ?? 0) + 1,
    employeesMentioned: (existing?.employeesMentioned ?? 0) + 1,
    medianApprovedHotelCents: proposedCap,
    recommendation:
      input.frictionNote?.trim() ||
      `Consider raising the ${cityLabel} hotel allowance toward ${formatUsd(proposedCap)}/night based on post-trip feedback.`,
    predictedImpact: [
      "Fewer out-of-policy booking requests",
      "Managers spend less time on lodging exceptions",
      `Higher lodging spend (~${formatUsd(proposedCap - currentCap)}/night)`,
    ],
    status: "open",
    proposedChanges: {
      cityCapsCents: { [cityKey]: proposedCap },
      standardMaxCents:
        cityKey && policy.rules.hotels.cityCapsCents[cityKey]
          ? undefined
          : proposedCap,
    },
    sourceFeedbackIds: Array.from(
      new Set([...(existing?.sourceFeedbackIds ?? []), input.feedbackId]),
    ),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await col<PolicySuggestion>(db, "policySuggestions").updateOne(
    { _id: id },
    { $set: suggestion },
    { upsert: true },
  );
}

export async function PolicyInsightAgent(organizationId: string) {
  const db = await getDb();
  return col<PolicySuggestion>(db, "policySuggestions")
    .find({ organizationId, status: "open" })
    .toArray();
}
