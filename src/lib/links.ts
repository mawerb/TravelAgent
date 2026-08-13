import type { FlightOffer } from "@/types";

/** Google Flights search so users can verify the route exists. */
export function googleFlightsUrl(input: {
  origin: string;
  destination: string;
  date: string;
  airline?: string;
}): string {
  const q = [
    "Flights",
    input.airline ? `on ${input.airline}` : null,
    `from ${input.origin}`,
    `to ${input.destination}`,
    `on ${input.date}`,
  ]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}

export function withFlightUrl(
  flight: FlightOffer,
  date: string,
): FlightOffer {
  if (flight.url) return flight;
  return {
    ...flight,
    url: googleFlightsUrl({
      origin: flight.origin,
      destination: flight.destination,
      date,
      airline: flight.airline,
    }),
  };
}

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

export const POLICY_PDF_PATH = "/policies/Acme_Travel_Policy_2026.pdf";
export const VENUE_URL =
  "https://www.mongodb.com/events/mongodb-local/las-vegas";
