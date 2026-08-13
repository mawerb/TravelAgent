import type { FlightOffer } from "@/types";

const AIRLINE_IATA: Record<string, string> = {
  united: "UA",
  delta: "DL",
  american: "AA",
  alaska: "AS",
  jetblue: "B6",
  southwest: "WN",
};

/**
 * Round-trip (or one-way) search with dates in the path — opens reliably in browsers.
 * Google Travel `?q=` / loose deep links currently redirect to /unsupported.
 */
export function googleFlightsUrl(input: {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
  airline?: string;
}): string {
  const origin = (input.origin || "").toUpperCase();
  const destination = (input.destination || "").toUpperCase();
  if (!origin || !destination || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    const q = ["flights", origin && `from ${origin}`, destination && `to ${destination}`, input.date]
      .filter(Boolean)
      .join(" ");
    return `https://www.kayak.com/search?q=${encodeURIComponent(q)}`;
  }

  const path = input.returnDate
    ? `${origin}-${destination}/${input.date}/${input.returnDate}`
    : `${origin}-${destination}/${input.date}`;
  const url = new URL(`https://www.kayak.com/flights/${path}`);
  const code = input.airline
    ? AIRLINE_IATA[input.airline.toLowerCase()]
    : undefined;
  if (code) url.searchParams.set("fs", `airlines=${code}`);
  url.searchParams.set("sort", "bestflight_a");
  return url.toString();
}

export function withFlightUrl(
  flight: FlightOffer,
  date: string,
  returnDate?: string,
): FlightOffer {
  return {
    ...flight,
    url: googleFlightsUrl({
      origin: flight.origin,
      destination: flight.destination,
      date,
      returnDate,
      airline: flight.airline,
    }),
  };
}

/**
 * Stable brand property pages — shareable, no session/token, do not expire.
 * Prefer these as the primary “verify this hotel” link when dates aren’t needed.
 */
export const HOTEL_URLS: Record<string, string> = {
  hotel_hilton_vegas_near:
    "https://www.hilton.com/en/hotels/lasehgv-hilton-grand-vacations-club-elara/",
  hotel_marriott_vegas_closest:
    "https://www.marriott.com/en-us/hotels/lasbr-renaissance-las-vegas-hotel/overview/",
  hotel_hyatt_vegas:
    "https://www.hyatt.com/hyatt-place/en-US/laszl-hyatt-place-las-vegas",
  hotel_westin_vegas:
    "https://www.marriott.com/en-us/hotels/laswi-the-westin-las-vegas-hotel-and-spa/overview/",
  hotel_hampton_vegas:
    "https://www.hilton.com/en/hotels/lashxhx-hampton-las-vegas-strip-south/",
};

/** MM/DD/YY for Marriott booking deep links */
function ymdToUsShort(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${m}/${d}/${y!.slice(2)}`;
}

/** Stable property page (shareable; does not expire). */
export function hotelListingUrl(input: {
  hotelId?: string;
  name: string;
  city?: string;
}): string {
  if (input.hotelId && HOTEL_URLS[input.hotelId]) {
    return HOTEL_URLS[input.hotelId]!;
  }
  const q = [input.name, input.city].filter(Boolean).join(" ");
  return `https://www.kayak.com/search?q=${encodeURIComponent(`hotel ${q}`)}`;
}

/**
 * Dated rates/availability deep link — check-in/out appear on the destination site.
 */
export function hotelRatesUrl(input: {
  hotelId?: string;
  name: string;
  city?: string;
  checkIn: string;
  checkOut: string;
}): string {
  const { checkIn, checkOut, hotelId } = input;
  switch (hotelId) {
    case "hotel_hilton_vegas_near":
      return `https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=LASEHGV&arrivalDate=${checkIn}&departureDate=${checkOut}`;
    case "hotel_hampton_vegas":
      return `https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=LASHXHX&arrivalDate=${checkIn}&departureDate=${checkOut}`;
    case "hotel_marriott_vegas_closest":
      return `https://www.marriott.com/reservation/rateListMenu.mi?propertyCode=LASBR&fromDate=${ymdToUsShort(checkIn)}&toDate=${ymdToUsShort(checkOut)}`;
    case "hotel_westin_vegas":
      return `https://www.marriott.com/reservation/rateListMenu.mi?propertyCode=LASWI&fromDate=${ymdToUsShort(checkIn)}&toDate=${ymdToUsShort(checkOut)}`;
    case "hotel_hyatt_vegas":
      return `https://www.hyatt.com/shop/rooms/laszl?checkinDate=${checkIn}&checkoutDate=${checkOut}`;
    default: {
      // Booking.com reliably pre-fills check-in / check-out (Google Hotels deep links redirect to /unsupported).
      const ss = [input.name, input.city].filter(Boolean).join(", ");
      const url = new URL("https://www.booking.com/searchresults.html");
      url.searchParams.set("ss", ss);
      url.searchParams.set("checkin", checkIn);
      url.searchParams.set("checkout", checkOut);
      url.searchParams.set("group_adults", "1");
      url.searchParams.set("no_rooms", "1");
      return url.toString();
    }
  }
}

/** @deprecated use hotelRatesUrl — kept name for call-site clarity during transition */
export const hotelUrl = hotelRatesUrl;

/** Resolve hotel id from a display name when booking only stored the name. */
export function hotelIdFromName(name: string): string | undefined {
  const n = name.toLowerCase();
  if (n.includes("elara") || n.includes("hilton grand")) {
    return "hotel_hilton_vegas_near";
  }
  if (n.includes("renaissance")) return "hotel_marriott_vegas_closest";
  if (n.includes("hyatt")) return "hotel_hyatt_vegas";
  if (n.includes("westin")) return "hotel_westin_vegas";
  if (n.includes("hampton")) return "hotel_hampton_vegas";
  return undefined;
}

export const POLICY_PDF_PATH = "/policies/Acme_Travel_Policy_2026.pdf";
export const VENUE_URL =
  "https://www.mongodb.com/events/mongodb-local/las-vegas";
