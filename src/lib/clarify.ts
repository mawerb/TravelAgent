import type { ClarifyingQuestion, ParsedTripRequest } from "@/types";
import { dollarsToCents, formatUsd } from "@/lib/money";

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return "dates not specified";
  }
  return `${s.toLocaleDateString("en-US", opts)} → ${e.toLocaleDateString("en-US", opts)}`;
}

export function isUnknownAirport(code?: string | null): boolean {
  if (!code) return true;
  const c = code.trim().toUpperCase();
  return (
    c.length < 3 ||
    c === "XXX" ||
    c === "UNK" ||
    c === "NULL" ||
    c === "UNKNOWN" ||
    c === "N/A"
  );
}

export function isUnknownCity(city?: string | null): boolean {
  if (!city) return true;
  const c = city.trim().toLowerCase();
  return (
    c.length === 0 ||
    c === "unknown" ||
    c === "null" ||
    c === "n/a" ||
    c === "unspecified"
  );
}

export function formatAirportLabel(code?: string | null): string {
  return isUnknownAirport(code) ? "not specified" : code!.trim().toUpperCase();
}

export function formatCityLabel(city?: string | null): string {
  return isUnknownCity(city) ? "not specified" : city!.trim();
}

export function formatRouteLabel(parsed: ParsedTripRequest): string {
  const origin = isUnknownAirport(parsed.originAirport)
    ? "No outbound location known"
    : parsed.originAirport.trim().toUpperCase();
  const dest = isUnknownCity(parsed.destinationCity)
    ? isUnknownAirport(parsed.destinationAirport)
      ? "destination not specified"
      : parsed.destinationAirport.trim().toUpperCase()
    : `${formatCityLabel(parsed.destinationCity)}${
        isUnknownAirport(parsed.destinationAirport)
          ? ""
          : ` (${parsed.destinationAirport.trim().toUpperCase()})`
      }`;
  return `${origin} → ${dest}`;
}

function budgetLine(parsed: ParsedTripRequest): string | null {
  const parts: string[] = [];
  if (parsed.maxFlightCents != null) {
    parts.push(`flight ≤ ${formatUsd(parsed.maxFlightCents)}`);
  }
  if (parsed.maxHotelNightlyCents != null) {
    parts.push(`hotel ≤ ${formatUsd(parsed.maxHotelNightlyCents)}/night`);
  }
  if (parsed.maxTotalCents != null) {
    parts.push(`total ≤ ${formatUsd(parsed.maxTotalCents)}`);
  }
  return parts.length ? parts.join("; ") : null;
}

export function describePreferenceCaps(parsed: ParsedTripRequest): string[] {
  const hints: string[] = [];
  if (parsed.preferredCabin) {
    hints.push(`${parsed.preferredCabin.replace("_", " ")} cabin`);
  }
  if (parsed.maxFlightCents != null) {
    hints.push(`flight ≤ ${formatUsd(parsed.maxFlightCents)}`);
  }
  if (parsed.maxHotelNightlyCents != null) {
    hints.push(`hotel ≤ ${formatUsd(parsed.maxHotelNightlyCents)}/night`);
  }
  if (parsed.maxTotalCents != null) {
    hints.push(`total ≤ ${formatUsd(parsed.maxTotalCents)}`);
  }
  return hints;
}

/** Human-readable why search produced zero bookable itineraries. */
export function explainEmptySearch(input: {
  parsed: ParsedTripRequest;
  flightCount: number;
  hotelCount: number;
}): string {
  const { parsed, flightCount, hotelCount } = input;
  const reasons: string[] = [];
  const origin = isUnknownAirport(parsed.originAirport)
    ? null
    : parsed.originAirport.toUpperCase();
  const dest = isUnknownAirport(parsed.destinationAirport)
    ? null
    : parsed.destinationAirport.toUpperCase();
  const city = isUnknownCity(parsed.destinationCity)
    ? null
    : parsed.destinationCity;

  if (!origin) {
    reasons.push("no outbound (origin) airport was set");
  }
  if (!dest && !city) {
    reasons.push("no destination airport or city was set");
  }
  if (flightCount === 0 && origin && dest) {
    reasons.push(
      `no flights in inventory for ${origin}→${dest} on ${parsed.startDate} (demo coverage is mainly SFO→LAS)`,
    );
  } else if (flightCount === 0 && origin) {
    reasons.push(
      `no flights found from ${origin}${dest ? ` to ${dest}` : ""}`,
    );
  } else if (flightCount === 0) {
    reasons.push("no matching flights were found");
  }
  if (hotelCount === 0) {
    reasons.push(
      city
        ? `no hotels in inventory for ${city} (demo hotels are seeded for Las Vegas)`
        : "no hotels matched this destination",
    );
  }

  const caps = describePreferenceCaps(parsed);
  if (caps.length && flightCount > 0 && hotelCount > 0) {
    reasons.push(
      `preference filters removed every combination (${caps.join("; ")})`,
    );
  } else if (flightCount > 0 && hotelCount > 0) {
    reasons.push("flight×hotel combinations were empty after filtering");
  }

  const route = formatRouteLabel(parsed);
  const why =
    reasons.length > 0
      ? reasons.map((r, i) => `${i + 1}. ${r}`).join(" ")
      : "no matching inventory for this request";

  return `Couldn't build a trip for ${route} (${parsed.startDate}→${parsed.endDate}). Why: ${why}`;
}

export function buildFollowUps(parsed: ParsedTripRequest): ClarifyingQuestion[] {
  const followUps: ClarifyingQuestion[] = [];
  if (isUnknownAirport(parsed.originAirport)) {
    followUps.push({
      id: "need_origin",
      field: "route",
      prompt: "Where are you flying out of?",
      answer: "No outbound location known yet — tell me an airport or city (e.g. “from SFO”).",
    });
  }
  if (
    isUnknownCity(parsed.destinationCity) &&
    isUnknownAirport(parsed.destinationAirport)
  ) {
    followUps.push({
      id: "need_destination",
      field: "route",
      prompt: "Where do you need to go?",
      answer: "Destination not specified — say a city or airport (e.g. “to Las Vegas”).",
    });
  }
  if (!parsed.startDate || !parsed.endDate) {
    followUps.push({
      id: "need_dates",
      field: "dates",
      prompt: "Which dates should I book?",
      answer: "Travel dates not specified — e.g. “Sep 22–25”.",
    });
  }
  return followUps;
}

/** Rebuild a natural-language prompt from confirmed/revised details after an error. */
export function composePromptFromParsed(parsed: ParsedTripRequest): string {
  const bits: string[] = [];
  if (!isUnknownAirport(parsed.originAirport)) {
    bits.push(`from ${parsed.originAirport.toUpperCase()}`);
  }
  if (!isUnknownCity(parsed.destinationCity)) {
    bits.push(`to ${parsed.destinationCity}`);
  } else if (!isUnknownAirport(parsed.destinationAirport)) {
    bits.push(`to ${parsed.destinationAirport.toUpperCase()}`);
  }
  if (parsed.startDate && parsed.endDate) {
    bits.push(`${parsed.startDate} to ${parsed.endDate}`);
  }
  if (parsed.purpose && !/^unknown$/i.test(parsed.purpose)) {
    bits.push(`for ${parsed.venueName ?? parsed.purpose}`);
  }
  if (parsed.preferredAirline) bits.push(`prefer ${parsed.preferredAirline}`);
  if (parsed.preferredHotelBrand) {
    bits.push(`prefer ${parsed.preferredHotelBrand} hotels`);
  }
  if (parsed.preferredCabin) {
    bits.push(`${parsed.preferredCabin.replace("_", " ")} cabin`);
  }
  if (parsed.proximityPreferred) bits.push("stay close to the venue");
  if (parsed.maxFlightCents != null) {
    bits.push(`flight under ${formatUsd(parsed.maxFlightCents)}`);
  }
  if (parsed.maxHotelNightlyCents != null) {
    bits.push(`hotel under ${formatUsd(parsed.maxHotelNightlyCents)}/night`);
  }
  if (parsed.maxTotalCents != null) {
    bits.push(`total under ${formatUsd(parsed.maxTotalCents)}`);
  }
  const composed = bits.join(", ");
  const base = parsed.rawQuery?.split("\n[revise]")[0]?.trim() || "";
  if (base && composed) return `${base}. Updated details: ${composed}.`;
  return composed || base || "Help me plan a business trip.";
}

/** Structured confirmations for chat/voice (ElevenLabs-ready) before searching. */
export function buildTripConfirmation(parsed: ParsedTripRequest): {
  summary: string;
  questions: ClarifyingQuestion[];
  followUps: ClarifyingQuestion[];
  canSearch: boolean;
} {
  const airline = parsed.preferredAirline ?? "no airline preference";
  const hotelBrand = parsed.preferredHotelBrand
    ? `; prefer ${parsed.preferredHotelBrand} hotels`
    : "";
  const cabin = parsed.preferredCabin
    ? `; ${parsed.preferredCabin.replace("_", " ")} cabin`
    : "";
  const proximity = parsed.proximityPreferred
    ? "stay close to the venue"
    : "no strong proximity preference";
  const budget = budgetLine(parsed);
  const route = formatRouteLabel(parsed);
  const followUps = buildFollowUps(parsed);

  const questions: ClarifyingQuestion[] = [
    {
      id: "dates",
      field: "dates",
      prompt: "Are these travel dates correct for policy and hotel nights?",
      answer: formatRange(parsed.startDate, parsed.endDate),
    },
    {
      id: "route",
      field: "route",
      prompt: "Confirm origin and destination?",
      answer: route,
    },
    {
      id: "purpose",
      field: "purpose",
      prompt: "Is this the right trip purpose / venue?",
      answer: parsed.venueName ?? parsed.purpose ?? "not specified",
    },
    {
      id: "prefs",
      field: "prefs",
      prompt: "Still want these preferences applied?",
      answer: `${airline}${hotelBrand}${cabin}; ${proximity}`,
    },
  ];

  if (budget) {
    questions.push({
      id: "budget",
      field: "budget",
      prompt: "Budget caps to enforce when searching?",
      answer: budget,
    });
  }

  const purposeBit = parsed.purpose ? ` for ${parsed.purpose}` : "";
  const summary =
    followUps.length > 0
      ? `Here’s what I have so far: ${route}${purposeBit}, ${formatRange(parsed.startDate, parsed.endDate)}. I still need a couple details before I can search.`
      : `I heard: ${route}${purposeBit}, ${formatRange(parsed.startDate, parsed.endDate)}. Prefer ${airline}${hotelBrand}${cabin}, and ${proximity}${budget ? `. Caps: ${budget}` : ""}. Please confirm before I search.`;

  return {
    summary,
    questions,
    followUps,
    canSearch: followUps.length === 0,
  };
}

const MONTH: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function titleAirline(name: string): string {
  const lower = name.toLowerCase();
  if (lower === "american") return "American";
  if (lower === "united") return "United";
  if (lower === "delta") return "Delta";
  if (lower === "southwest") return "Southwest";
  if (lower === "jetblue") return "JetBlue";
  return name[0]!.toUpperCase() + name.slice(1);
}

function titleBrand(name: string): string {
  const lower = name.toLowerCase();
  if (lower === "hilton") return "Hilton";
  if (lower === "marriott") return "Marriott";
  if (lower === "hyatt") return "Hyatt";
  if (lower === "westin") return "Westin";
  if (lower === "hampton") return "Hampton";
  return name[0]!.toUpperCase() + name.slice(1);
}

function moneyToCents(raw: string): number {
  return dollarsToCents(Number(raw.replace(/,/g, "")));
}

/** True when the user has set search constraints beyond the default demo script. */
export function hasUserSearchOverrides(parsed: ParsedTripRequest): boolean {
  return Boolean(
    parsed.maxFlightCents != null ||
      parsed.maxHotelNightlyCents != null ||
      parsed.maxTotalCents != null ||
      parsed.preferredHotelBrand ||
      parsed.preferredCabin ||
      (parsed.preferredAirline &&
        parsed.preferredAirline.toLowerCase() !== "united") ||
      parsed.proximityPreferred === false,
  );
}

/**
 * Deterministic revision heuristics (fallback + demo). Prefer LLM via reviseTripRequest.
 */
export function reviseParsedTrip(
  current: ParsedTripRequest,
  message: string,
): { parsed: ParsedTripRequest; reply: string; changed: boolean } {
  const msg = message.trim();
  if (!msg) {
    return {
      parsed: current,
      reply:
        "Tell me what you’d like to change — dates, airline, hotel brand, cabin, proximity, or price caps.",
      changed: false,
    };
  }

  const next: ParsedTripRequest = { ...current };
  const changes: string[] = [];
  const year = Number(current.startDate.slice(0, 4)) || 2026;

  const airline = msg.match(
    /\b(united|delta|american|southwest|jetblue)\b/i,
  );
  if (airline) {
    next.preferredAirline = titleAirline(airline[1]!);
    changes.push(`airline → ${next.preferredAirline}`);
  }

  const brand = msg.match(/\b(hilton|marriott|hyatt|westin|hampton)\b/i);
  if (brand) {
    next.preferredHotelBrand = titleBrand(brand[1]!);
    changes.push(`hotel brand → ${next.preferredHotelBrand}`);
  }

  if (/\bbusiness\b/i.test(msg)) {
    next.preferredCabin = "business";
    changes.push("cabin → business");
  } else if (/premium\s*economy/i.test(msg)) {
    next.preferredCabin = "premium_economy";
    changes.push("cabin → premium economy");
  } else if (/\beconomy\b/i.test(msg)) {
    next.preferredCabin = "economy";
    changes.push("cabin → economy");
  }

  if (
    /not\s+close|don'?t\s+(need|have)\s+to\s+be\s+close|farther|any\s+hotel|distance\s+(doesn'?t|does\s+not)\s+matter/i.test(
      msg,
    )
  ) {
    next.proximityPreferred = false;
    changes.push("proximity preference cleared");
  } else if (/close|near\s+(the\s+)?venue|keep me close/i.test(msg)) {
    next.proximityPreferred = true;
    changes.push("stay close to the venue");
  }

  const flightCap = msg.match(
    /flight[s]?\s*(?:ticket|fare|price|cost)?\s*(?:under|below|max(?:imum)?|less\s+than|<=|≦)\s*\$?\s*([\d,]+)/i,
  ) ?? msg.match(
    /(?:under|below|max(?:imum)?|less\s+than)\s*\$?\s*([\d,]+)\s*(?:for\s+)?(?:the\s+)?flight/i,
  );
  if (flightCap) {
    next.maxFlightCents = moneyToCents(flightCap[1]!);
    changes.push(`flight cap → ${formatUsd(next.maxFlightCents)}`);
  }

  const hotelCap = msg.match(
    /hotel\s*(?:rate|price|cost|night(?:ly)?)?\s*(?:under|below|max(?:imum)?|less\s+than|<=|≦)\s*\$?\s*([\d,]+)/i,
  ) ?? msg.match(
    /(?:under|below|max(?:imum)?|less\s+than)\s*\$?\s*([\d,]+)\s*(?:\/\s*night|a\s+night|per\s+night)?\s*(?:for\s+)?(?:the\s+)?hotel/i,
  );
  if (hotelCap) {
    next.maxHotelNightlyCents = moneyToCents(hotelCap[1]!);
    changes.push(`hotel cap → ${formatUsd(next.maxHotelNightlyCents)}/night`);
  }

  const totalCap = msg.match(
    /(?:total|trip|overall|budget)\s*(?:under|below|max(?:imum)?|less\s+than|of|<=|≦)\s*\$?\s*([\d,]+)/i,
  ) ?? msg.match(
    /(?:under|below|max(?:imum)?|less\s+than)\s*\$?\s*([\d,]+)\s*(?:total|for\s+the\s+trip|overall)/i,
  );
  if (totalCap) {
    next.maxTotalCents = moneyToCents(totalCap[1]!);
    changes.push(`total cap → ${formatUsd(next.maxTotalCents)}`);
  }

  // Bare "under $X" with no noun → treat as total cap if nothing else matched
  if (
    !flightCap &&
    !hotelCap &&
    !totalCap &&
    /(?:under|below|max(?:imum)?|less\s+than)\s*\$?\s*([\d,]+)/i.test(msg)
  ) {
    const bare = msg.match(
      /(?:under|below|max(?:imum)?|less\s+than)\s*\$?\s*([\d,]+)/i,
    );
    if (bare) {
      next.maxTotalCents = moneyToCents(bare[1]!);
      changes.push(`total cap → ${formatUsd(next.maxTotalCents)}`);
    }
  }

  const range = msg.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[-–to]+\s*(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/i,
  );
  if (range) {
    const m1 = MONTH[range[1]!.toLowerCase()]!;
    const d1 = Number(range[2]);
    const m2 = range[3] ? MONTH[range[3].toLowerCase()]! : m1;
    const d2 = Number(range[4]);
    next.startDate = ymd(year, m1, d1);
    next.endDate = ymd(year, m2, d2);
    changes.push(`dates → ${formatRange(next.startDate, next.endDate)}`);
  } else {
    const checkIn = msg.match(
      /check[- ]?in\s+(?:to\s+|on\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})/i,
    );
    if (checkIn) {
      next.startDate = ymd(
        year,
        MONTH[checkIn[1]!.toLowerCase()]!,
        Number(checkIn[2]),
      );
      changes.push(`check-in → ${next.startDate}`);
    }
    const checkOut = msg.match(
      /check[- ]?out\s+(?:to\s+|on\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})/i,
    );
    if (checkOut) {
      next.endDate = ymd(
        year,
        MONTH[checkOut[1]!.toLowerCase()]!,
        Number(checkOut[2]),
      );
      changes.push(`check-out → ${next.endDate}`);
    }
  }

  const fromAirport = msg.match(/\bfrom\s+([A-Za-z]{3})\b/);
  if (fromAirport) {
    next.originAirport = fromAirport[1]!.toUpperCase();
    changes.push(`origin → ${next.originAirport}`);
  }
  const toAirport = msg.match(/\bto\s+([A-Za-z]{3})\b(?!\s*\d)/);
  if (toAirport && !/to\s+the\b/i.test(msg)) {
    const code = toAirport[1]!.toUpperCase();
    if (code !== next.originAirport && MONTH[code.toLowerCase()] === undefined) {
      if (!/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i.test(code)) {
        next.destinationAirport = code;
        changes.push(`destination airport → ${code}`);
      }
    }
  }

  if (/new\s*york|\bnyc\b/i.test(msg)) {
    next.destinationCity = "New York";
    next.destinationAirport = "JFK";
    changes.push("destination → New York (JFK)");
  } else if (/las\s*vegas|\blas\b/i.test(msg)) {
    next.destinationCity = "Las Vegas";
    next.destinationAirport = "LAS";
    changes.push("destination → Las Vegas (LAS)");
  }

  if (/mongodb\.local/i.test(msg)) {
    next.purpose = "MongoDB.local";
    next.venueName = "MongoDB.local";
    changes.push("purpose → MongoDB.local");
  }

  if (changes.length === 0) {
    return {
      parsed: current,
      reply:
        "I couldn’t map that yet. Try “flight under $300”, “hotel under $200/night”, “prefer Delta”, or “Sep 23–26”.",
      changed: false,
    };
  }

  next.rawQuery = `${current.rawQuery}\n[revise] ${msg}`;
  return {
    parsed: next,
    reply: `Got it — updated ${changes.join("; ")}.`,
    changed: true,
  };
}

/** Merge an LLM patch onto the current parsed trip. */
export function applyTripPatch(
  current: ParsedTripRequest,
  patch: Partial<ParsedTripRequest>,
  message: string,
): ParsedTripRequest {
  const next: ParsedTripRequest = {
    ...current,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined && v !== null),
    ),
    rawQuery: `${current.rawQuery}\n[revise] ${message}`,
  };
  return next;
}
