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
