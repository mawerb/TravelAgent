import { Duffel } from "@duffel/api";
import type { FlightOffer } from "@/types";
import { googleFlightsUrl } from "@/lib/links";
import { dollarsToCents } from "@/lib/money";

let client: Duffel | null = null;

export function hasDuffelToken(): boolean {
  return Boolean(process.env.DUFFEL_ACCESS_TOKEN?.trim());
}

export function getDuffel(): Duffel {
  if (!client) {
    const token = process.env.DUFFEL_ACCESS_TOKEN?.trim();
    if (!token) throw new Error("DUFFEL_ACCESS_TOKEN is not set");
    client = new Duffel({
      token,
      ...(process.env.DUFFEL_API_URL
        ? { basePath: process.env.DUFFEL_API_URL }
        : {}),
    });
  }
  return client;
}

function hhmm(iso: string | undefined): string {
  if (!iso) return "00:00";
  const t = iso.includes("T") ? iso.split("T")[1]! : iso;
  return t.slice(0, 5);
}

function durationMinutes(isoDuration: string | undefined, dep?: string, arr?: string): number {
  if (isoDuration) {
    const m = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
    if (m) return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
  }
  if (dep && arr) {
    const ms = Date.parse(arr) - Date.parse(dep);
    if (Number.isFinite(ms) && ms > 0) return Math.round(ms / 60000);
  }
  return 0;
}

function mapCabin(
  cabin: string | undefined,
): FlightOffer["cabin"] {
  switch ((cabin ?? "").toLowerCase()) {
    case "premium_economy":
      return "premium_economy";
    case "business":
    case "first":
      return "business";
    default:
      return "economy";
  }
}

/**
 * Live Duffel offer search → FlightOffer[]. Falls back to [] on empty/invalid input.
 * Stays (hotels) is separate — this token path is flights-only until Stays is enabled.
 */
export async function searchDuffelFlights(input: {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
  limit?: number;
}): Promise<FlightOffer[]> {
  const origin = input.origin.toUpperCase();
  const destination = input.destination.toUpperCase();
  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
    return [];
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return [];

  const slices: Array<{
    origin: string;
    destination: string;
    departure_date: string;
  }> = [
    { origin, destination, departure_date: input.date },
  ];
  if (input.returnDate && /^\d{4}-\d{2}-\d{2}$/.test(input.returnDate)) {
    slices.push({
      origin: destination,
      destination: origin,
      departure_date: input.returnDate,
    });
  }

  const duffel = getDuffel();
  const res = await duffel.offerRequests.create({
    slices: slices as Parameters<typeof duffel.offerRequests.create>[0]["slices"],
    passengers: [{ type: "adult" }],
    cabin_class: "economy",
    return_offers: true,
  });

  const limit = input.limit ?? 12;
  const seen = new Set<string>();
  const offers = (res.data.offers ?? [])
    .filter((o) => (o.total_currency ?? "USD").toUpperCase() === "USD")
    .filter((o) => {
      if (!o.id || seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    })
    .slice()
    .sort(
      (a, b) =>
        Number.parseFloat(a.total_amount) - Number.parseFloat(b.total_amount),
    )
    .slice(0, limit);

  return offers.map((o) => {
    const outbound = o.slices?.[0];
    const segments = outbound?.segments ?? [];
    const first = segments[0];
    const last = segments[segments.length - 1];
    const airline =
      first?.marketing_carrier?.name ??
      o.owner?.name ??
      "Airline";
    const dep = first?.departing_at;
    const arr = last?.arriving_at;
    return {
      id: o.id,
      airline,
      origin,
      destination,
      departTime: hhmm(dep),
      arriveTime: hhmm(arr),
      durationMinutes: durationMinutes(
        outbound?.duration ?? undefined,
        dep ?? undefined,
        arr ?? undefined,
      ),
      stops: Math.max(0, segments.length - 1),
      cabin: mapCabin(
        first?.passengers?.[0]?.cabin_class ??
          first?.passengers?.[0]?.cabin_class_marketing_name,
      ),
      priceCents: dollarsToCents(Number.parseFloat(o.total_amount)),
      inventory: 1,
      url: googleFlightsUrl({
        origin,
        destination,
        date: input.date,
        returnDate: input.returnDate,
        airline,
      }),
    } satisfies FlightOffer;
  });
}
