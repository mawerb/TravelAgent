import type { MoneyCents } from "@/types";

/** Hard cap — never emit more than this many distinct booking sites. */
export const MAX_BOOKING_SITES = 10;

export type BookingSiteId =
  | "kayak"
  | "expedia"
  | "momondo"
  | "skyscanner"
  | "priceline"
  | "booking"
  | "hotels"
  | "agoda"
  | "orbitz"
  | "brand";

export type BookingSiteQuote = {
  siteId: BookingSiteId;
  siteName: string;
  kind: "flight" | "hotel";
  /** Shareable https deep link with dates in path/query (no session tokens). */
  url: string;
  priceCents: MoneyCents;
  badge?: "cheapest" | "best";
};

const AIRLINE_IATA: Record<string, string> = {
  united: "UA",
  delta: "DL",
  american: "AA",
  alaska: "AS",
  jetblue: "B6",
  southwest: "WN",
};

/** Stable catalog (≤10). Only sites with public, dated, shareable URLs. */
const SITES: Record<
  BookingSiteId,
  { name: string; flight: boolean; hotel: boolean; priceBias: number }
> = {
  kayak: { name: "Kayak", flight: true, hotel: true, priceBias: 0 },
  expedia: { name: "Expedia", flight: true, hotel: true, priceBias: 0.04 },
  momondo: { name: "Momondo", flight: true, hotel: false, priceBias: -0.03 },
  skyscanner: { name: "Skyscanner", flight: true, hotel: false, priceBias: -0.02 },
  priceline: { name: "Priceline", flight: true, hotel: true, priceBias: 0.01 },
  booking: { name: "Booking.com", flight: false, hotel: true, priceBias: -0.01 },
  hotels: { name: "Hotels.com", flight: false, hotel: true, priceBias: 0.02 },
  agoda: { name: "Agoda", flight: false, hotel: true, priceBias: -0.04 },
  orbitz: { name: "Orbitz", flight: true, hotel: true, priceBias: 0.05 },
  brand: { name: "Brand direct", flight: true, hotel: true, priceBias: 0.06 },
};

function assertCatalogCap(): void {
  if (Object.keys(SITES).length > MAX_BOOKING_SITES) {
    throw new Error(`Booking site catalog exceeds ${MAX_BOOKING_SITES}`);
  }
}
assertCatalogCap();

function ymdToUs(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}/${y}`;
}

function ymdCompact(ymd: string): string {
  return ymd.replace(/-/g, "");
}

function yymmdd(ymd: string): string {
  return ymd.slice(2).replace(/-/g, "");
}

function airlineCode(airline?: string): string | undefined {
  if (!airline) return undefined;
  return AIRLINE_IATA[airline.toLowerCase()];
}

function quotePrice(baseCents: number, bias: number, siteId: string): number {
  // Tiny deterministic jitter so ties are rare but stable across refreshes.
  let h = 0;
  for (let i = 0; i < siteId.length; i++) h = (h * 31 + siteId.charCodeAt(i)) >>> 0;
  const jitter = ((h % 7) - 3) / 100; // -0.03 … +0.03
  return Math.max(100, Math.round(baseCents * (1 + bias + jitter)));
}

function flightUrl(
  siteId: BookingSiteId,
  input: {
    origin: string;
    destination: string;
    date: string;
    returnDate?: string;
    airline?: string;
  },
): string | null {
  const o = input.origin.toUpperCase();
  const d = input.destination.toUpperCase();
  if (!o || !d || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return null;
  const ret = input.returnDate && /^\d{4}-\d{2}-\d{2}$/.test(input.returnDate)
    ? input.returnDate
    : undefined;
  const code = airlineCode(input.airline);

  switch (siteId) {
    case "kayak": {
      const path = ret ? `${o}-${d}/${input.date}/${ret}` : `${o}-${d}/${input.date}`;
      const url = new URL(`https://www.kayak.com/flights/${path}`);
      if (code) url.searchParams.set("fs", `airlines=${code}`);
      url.searchParams.set("sort", "bestflight_a");
      return url.toString();
    }
    case "expedia": {
      const url = new URL("https://www.expedia.com/Flights-Search");
      url.searchParams.set("trip", ret ? "roundtrip" : "oneway");
      url.searchParams.set(
        "leg1",
        `from:${o},to:${d},departure:${ymdToUs(input.date)}TANYT`,
      );
      if (ret) {
        url.searchParams.set(
          "leg2",
          `from:${d},to:${o},departure:${ymdToUs(ret)}TANYT`,
        );
      }
      url.searchParams.set("passengers", "adults:1,children:0,seniors:0,infantinlap:N");
      url.searchParams.set("mode", "search");
      return url.toString();
    }
    case "momondo": {
      const path = ret
        ? `${o}-${d}/${input.date}/${ret}`
        : `${o}-${d}/${input.date}`;
      return `https://www.momondo.com/flight-search/${path}?sort=bestflight_a`;
    }
    case "skyscanner": {
      const path = ret
        ? `${o.toLowerCase()}/${d.toLowerCase()}/${yymmdd(input.date)}/${yymmdd(ret)}`
        : `${o.toLowerCase()}/${d.toLowerCase()}/${yymmdd(input.date)}`;
      return `https://www.skyscanner.com/transport/flights/${path}/`;
    }
    case "priceline": {
      const path = ret
        ? `${o}-${d}-${ymdCompact(input.date)}/${d}-${o}-${ymdCompact(ret)}`
        : `${o}-${d}-${ymdCompact(input.date)}`;
      return `https://www.priceline.com/relax/at/fly/results/${path}/`;
    }
    case "orbitz": {
      const url = new URL("https://www.orbitz.com/Flights-Search");
      url.searchParams.set("trip", ret ? "roundtrip" : "oneway");
      url.searchParams.set(
        "leg1",
        `from:${o},to:${d},departure:${ymdToUs(input.date)}TANYT`,
      );
      if (ret) {
        url.searchParams.set(
          "leg2",
          `from:${d},to:${o},departure:${ymdToUs(ret)}TANYT`,
        );
      }
      url.searchParams.set("passengers", "adults:1");
      url.searchParams.set("mode", "search");
      return url.toString();
    }
    case "brand": {
      // Airline marketing sites don’t share a single dated deep-link schema;
      // Kayak filtered to the carrier stays shareable and dated.
      if (!code) return null;
      const path = ret ? `${o}-${d}/${input.date}/${ret}` : `${o}-${d}/${input.date}`;
      const url = new URL(`https://www.kayak.com/flights/${path}`);
      url.searchParams.set("fs", `airlines=${code}`);
      return url.toString();
    }
    default:
      return null;
  }
}

function hotelUrl(
  siteId: BookingSiteId,
  input: {
    name: string;
    city: string;
    checkIn: string;
    checkOut: string;
    brandUrl?: string;
  },
): string | null {
  const { name, city, checkIn, checkOut } = input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    return null;
  }
  const q = [name, city].filter(Boolean).join(", ");

  switch (siteId) {
    case "booking": {
      const url = new URL("https://www.booking.com/searchresults.html");
      url.searchParams.set("ss", q);
      url.searchParams.set("checkin", checkIn);
      url.searchParams.set("checkout", checkOut);
      url.searchParams.set("group_adults", "1");
      url.searchParams.set("no_rooms", "1");
      return url.toString();
    }
    case "hotels": {
      const url = new URL("https://www.hotels.com/Hotel-Search");
      url.searchParams.set("destination", city || name);
      url.searchParams.set("startDate", checkIn);
      url.searchParams.set("endDate", checkOut);
      url.searchParams.set("adults", "1");
      if (name) url.searchParams.set("keyword", name);
      return url.toString();
    }
    case "expedia": {
      const url = new URL("https://www.expedia.com/Hotel-Search");
      url.searchParams.set("destination", city || name);
      url.searchParams.set("startDate", checkIn);
      url.searchParams.set("endDate", checkOut);
      url.searchParams.set("adults", "1");
      return url.toString();
    }
    case "kayak": {
      const slug = (city || name).trim().replace(/\s+/g, "-");
      return `https://www.kayak.com/hotels/${encodeURIComponent(slug)}/${checkIn}/${checkOut}/1adults`;
    }
    case "agoda": {
      const url = new URL("https://www.agoda.com/search");
      url.searchParams.set("checkIn", checkIn);
      url.searchParams.set("checkOut", checkOut);
      url.searchParams.set("adults", "1");
      url.searchParams.set("rooms", "1");
      url.searchParams.set("textToSearch", q);
      return url.toString();
    }
    case "priceline": {
      const url = new URL("https://www.priceline.com/relax/at/hotels/results/");
      url.searchParams.set("location-name", city || name);
      url.searchParams.set("check-in", checkIn);
      url.searchParams.set("check-out", checkOut);
      url.searchParams.set("rooms", "1");
      url.searchParams.set("adults", "1");
      return url.toString();
    }
    case "orbitz": {
      const url = new URL("https://www.orbitz.com/Hotel-Search");
      url.searchParams.set("destination", city || name);
      url.searchParams.set("startDate", checkIn);
      url.searchParams.set("endDate", checkOut);
      return url.toString();
    }
    case "brand":
      return input.brandUrl || null;
    default:
      return null;
  }
}

function badgeQuotes(quotes: BookingSiteQuote[]): BookingSiteQuote[] {
  if (quotes.length === 0) return quotes;
  const cheapest = quotes.reduce((a, b) =>
    a.priceCents <= b.priceCents ? a : b,
  );
  // "Best" = cheapest among the lower half of prices (value), prefer non-aggregator brand if within 3%.
  const sorted = [...quotes].sort((a, b) => a.priceCents - b.priceCents);
  const floor = sorted[0]!.priceCents;
  const near = sorted.filter((q) => q.priceCents <= floor * 1.03);
  const best =
    near.find((q) => q.siteId === "brand") ??
    near.find((q) => q.siteId === "kayak") ??
    cheapest;

  return quotes.map((q) => ({
    ...q,
    badge:
      q.siteId === cheapest.siteId
        ? "cheapest"
        : q.siteId === best.siteId
          ? "best"
          : undefined,
  }));
}

export type BookingCompareResult = {
  flights: BookingSiteQuote[];
  hotels: BookingSiteQuote[];
  /** Distinct sites touched (≤ MAX_BOOKING_SITES). */
  sitesCompared: number;
  cheapestFlight: BookingSiteQuote | null;
  bestFlight: BookingSiteQuote | null;
  cheapestHotel: BookingSiteQuote | null;
  bestHotel: BookingSiteQuote | null;
};

/**
 * Compare the itinerary across shareable OTAs (≤10). Prices are deterministic
 * demo quotes so ranking is stable; URLs are real dated deep links.
 * Upgrade path: replace quotePrice() with live provider responses.
 */
export function compareBookingSites(input: {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
  airline?: string;
  flightCents: number;
  hotelName: string;
  hotelCity: string;
  checkIn: string;
  checkOut: string;
  hotelCents: number;
  hotelBrandUrl?: string;
}): BookingCompareResult {
  const flights: BookingSiteQuote[] = [];
  const hotels: BookingSiteQuote[] = [];
  const used = new Set<BookingSiteId>();

  for (const siteId of Object.keys(SITES) as BookingSiteId[]) {
    if (used.size >= MAX_BOOKING_SITES && !used.has(siteId)) break;
    const meta = SITES[siteId]!;

    if (meta.flight) {
      const url = flightUrl(siteId, input);
      if (url) {
        used.add(siteId);
        flights.push({
          siteId,
          siteName:
            siteId === "brand"
              ? `${input.airline ?? "Airline"} (via Kayak)`
              : meta.name,
          kind: "flight",
          url,
          priceCents: quotePrice(
            input.flightCents,
            meta.priceBias,
            `f:${siteId}`,
          ),
        });
      }
    }

    if (meta.hotel) {
      const url = hotelUrl(siteId, {
        name: input.hotelName,
        city: input.hotelCity,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        brandUrl: input.hotelBrandUrl,
      });
      if (url) {
        used.add(siteId);
        hotels.push({
          siteId,
          siteName: siteId === "brand" ? "Hotel direct" : meta.name,
          kind: "hotel",
          url,
          priceCents: quotePrice(
            input.hotelCents,
            meta.priceBias,
            `h:${siteId}`,
          ),
        });
      }
    }
  }

  const flightQuotes = badgeQuotes(flights).sort((a, b) => a.priceCents - b.priceCents);
  const hotelQuotes = badgeQuotes(hotels).sort((a, b) => a.priceCents - b.priceCents);

  return {
    flights: flightQuotes,
    hotels: hotelQuotes,
    sitesCompared: used.size,
    cheapestFlight: flightQuotes.find((q) => q.badge === "cheapest") ?? null,
    bestFlight:
      flightQuotes.find((q) => q.badge === "best") ??
      flightQuotes.find((q) => q.badge === "cheapest") ??
      null,
    cheapestHotel: hotelQuotes.find((q) => q.badge === "cheapest") ?? null,
    bestHotel:
      hotelQuotes.find((q) => q.badge === "best") ??
      hotelQuotes.find((q) => q.badge === "cheapest") ??
      null,
  };
}

export function bookingSitesSelfCheck(): void {
  assertCatalogCap();
  const r = compareBookingSites({
    origin: "SFO",
    destination: "LAS",
    date: "2026-09-22",
    returnDate: "2026-09-25",
    airline: "United",
    flightCents: 34600,
    hotelName: "Hilton Grand Vacations Club Elara",
    hotelCity: "Las Vegas",
    checkIn: "2026-09-22",
    checkOut: "2026-09-25",
    hotelCents: 73800,
    hotelBrandUrl:
      "https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=LASEHGV&arrivalDate=2026-09-22&departureDate=2026-09-25",
  });
  if (r.sitesCompared > MAX_BOOKING_SITES) {
    throw new Error(`compared ${r.sitesCompared} sites`);
  }
  if (r.flights.length < 3 || r.hotels.length < 3) {
    throw new Error("expected multi-site flight and hotel quotes");
  }
  for (const q of [...r.flights, ...r.hotels]) {
    if (!q.url.startsWith("https://")) throw new Error(`non-https ${q.siteId}`);
    const decoded = decodeURIComponent(q.url);
    const hasDepart =
      decoded.includes("2026-09-22") ||
      decoded.includes("20260922") ||
      decoded.includes("9/22/2026") ||
      decoded.includes("260922");
    if (q.kind === "flight" && !hasDepart) {
      throw new Error(`flight ${q.siteId} missing depart date in URL: ${q.url}`);
    }
    if (q.kind === "hotel" && !hasDepart) {
      throw new Error(`hotel ${q.siteId} missing check-in in URL: ${q.url}`);
    }
  }
  const cheap = r.flights.reduce((a, b) => (a.priceCents <= b.priceCents ? a : b));
  if (r.cheapestFlight?.siteId !== cheap.siteId) {
    throw new Error("cheapest flight badge mismatch");
  }
}
