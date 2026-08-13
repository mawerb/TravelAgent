import type { ClarifyingQuestion, ParsedTripRequest } from "@/types";

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  return `${s.toLocaleDateString("en-US", opts)} → ${e.toLocaleDateString("en-US", opts)}`;
}

/** Structured confirmations for chat/voice (ElevenLabs-ready) before searching. */
export function buildTripConfirmation(parsed: ParsedTripRequest): {
  summary: string;
  questions: ClarifyingQuestion[];
} {
  const airline = parsed.preferredAirline ?? "no airline preference";
  const proximity = parsed.proximityPreferred
    ? "stay close to the venue"
    : "no proximity preference";

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
      answer: `${parsed.originAirport} → ${parsed.destinationCity} (${parsed.destinationAirport})`,
    },
    {
      id: "purpose",
      field: "purpose",
      prompt: "Is this the right trip purpose / venue?",
      answer: parsed.venueName ?? parsed.purpose,
    },
    {
      id: "prefs",
      field: "prefs",
      prompt: "Still want these preferences applied?",
      answer: `${airline}; ${proximity}`,
    },
  ];

  const summary = `I heard: ${parsed.originAirport} → ${parsed.destinationCity} for ${parsed.purpose}, ${formatRange(parsed.startDate, parsed.endDate)}. Prefer ${airline}, and ${proximity}. Please confirm before I search.`;

  return { summary, questions };
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

/**
 * Apply a natural-language revision to a parsed trip.
 * Deterministic heuristics first (demo + ElevenLabs-ready); LLM only when needed.
 */
export function reviseParsedTrip(
  current: ParsedTripRequest,
  message: string,
): { parsed: ParsedTripRequest; reply: string; changed: boolean } {
  const msg = message.trim();
  if (!msg) {
    return {
      parsed: current,
      reply: "Tell me what you’d like to change — dates, airline, destination, or proximity.",
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
      // only treat as airport if looks like IATA (all caps letters) — already 3 letters
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
  } else {
    const purpose = msg.match(
      /(?:purpose|venue|for)\s*[:=]?\s*([A-Za-z0-9 .'-]{3,40})/i,
    );
    if (purpose && !/for\s+(a\s+)?(flight|hotel|trip)/i.test(msg)) {
      const value = purpose[1]!.trim();
      if (!/^(united|delta|american|sep|september)/i.test(value)) {
        next.purpose = value;
        next.venueName = value;
        changes.push(`purpose → ${value}`);
      }
    }
  }

  if (changes.length === 0) {
    return {
      parsed: current,
      reply:
        "I couldn’t map that to a trip change. Try “prefer Delta”, “Sep 23–26”, or “don’t need to be close to the venue”.",
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
