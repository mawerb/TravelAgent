import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hotelUrl, hotelListingUrl, googleFlightsUrl } from "./links";
import {
  buildTripConfirmation,
  reviseParsedTrip,
  explainEmptySearch,
} from "./clarify";

describe("links", () => {
  it("embeds hotel check-in and check-out on Hilton rates deep link", () => {
    const url = hotelUrl({
      hotelId: "hotel_hilton_vegas_near",
      name: "Hilton Grand Vacations Club Elara",
      checkIn: "2026-09-22",
      checkOut: "2026-09-25",
    });
    assert.match(url, /arrivalDate=2026-09-22/);
    assert.match(url, /departureDate=2026-09-25/);
  });

  it("uses a stable property listing URL without dates (shareable)", () => {
    const url = hotelListingUrl({
      hotelId: "hotel_hilton_vegas_near",
      name: "Hilton Grand Vacations Club Elara",
    });
    assert.equal(
      url,
      "https://www.hilton.com/en/hotels/lasehgv-hilton-grand-vacations-club-elara/",
    );
    assert.doesNotMatch(url, /arrivalDate|fromDate|dates=/);
  });

  it("embeds check-in/out on Booking.com fallback rates link", () => {
    const url = hotelUrl({
      name: "Unknown Inn",
      city: "Las Vegas",
      checkIn: "2026-09-22",
      checkOut: "2026-09-25",
    });
    assert.match(url, /booking\.com/);
    assert.match(url, /checkin=2026-09-22/);
    assert.match(url, /checkout=2026-09-25/);
  });

  it("puts origin, destination, and both dates in the Kayak flight path", () => {
    const url = googleFlightsUrl({
      origin: "SFO",
      destination: "LAS",
      date: "2026-09-22",
      returnDate: "2026-09-25",
      airline: "United",
    });
    assert.match(url, /kayak\.com\/flights\/SFO-LAS\/2026-09-22\/2026-09-25/);
    assert.match(url, /airlines(%3D|=)UA/);
  });
});

describe("clarify", () => {
  it("asks follow-up questions that include the trip dates", () => {
    const { summary, questions, canSearch, followUps } = buildTripConfirmation({
      originAirport: "SFO",
      destinationCity: "Las Vegas",
      destinationAirport: "LAS",
      startDate: "2026-09-22",
      endDate: "2026-09-25",
      purpose: "MongoDB.local",
      venueName: "MongoDB.local",
      preferredAirline: "United",
      proximityPreferred: true,
      rawQuery: "demo",
    });
    assert.match(summary, /Las Vegas/);
    assert.equal(questions.length, 4);
    assert.match(questions[0]!.answer, /Sep/);
    assert.match(questions[0]!.answer, /22/);
    assert.equal(canSearch, true);
    assert.equal(followUps.length, 0);
  });

  it("labels missing origin without inventing a city", () => {
    const { summary, followUps, canSearch } = buildTripConfirmation({
      originAirport: "",
      destinationCity: "Seattle",
      destinationAirport: "SEA",
      startDate: "2026-09-08",
      endDate: "2026-09-10",
      purpose: "Seattle trip",
      proximityPreferred: false,
      rawQuery: "seattle",
    });
    assert.match(summary, /No outbound location known/);
    assert.equal(canSearch, false);
    assert.ok(followUps.some((f) => f.id === "need_origin"));
  });

  it("revises airline and dates from a natural-language prompt", () => {
    const base = {
      originAirport: "SFO",
      destinationCity: "Las Vegas",
      destinationAirport: "LAS",
      startDate: "2026-09-22",
      endDate: "2026-09-25",
      purpose: "MongoDB.local",
      venueName: "MongoDB.local",
      preferredAirline: "United",
      proximityPreferred: true,
      rawQuery: "demo",
    };
    const { parsed, changed } = reviseParsedTrip(
      base,
      "Prefer Delta and change dates to Sep 23-26",
    );
    assert.equal(changed, true);
    assert.equal(parsed.preferredAirline, "Delta");
    assert.equal(parsed.startDate, "2026-09-23");
    assert.equal(parsed.endDate, "2026-09-26");
  });

  it("revises flight and hotel price caps from natural language", () => {
    const base = {
      originAirport: "SFO",
      destinationCity: "Las Vegas",
      destinationAirport: "LAS",
      startDate: "2026-09-22",
      endDate: "2026-09-25",
      purpose: "MongoDB.local",
      preferredAirline: "United",
      proximityPreferred: true,
      rawQuery: "demo",
    };
    const { parsed, changed } = reviseParsedTrip(
      base,
      "Keep the flight under $320 and hotel under $220 a night",
    );
    assert.equal(changed, true);
    assert.equal(parsed.maxFlightCents, 32000);
    assert.equal(parsed.maxHotelNightlyCents, 22000);
  });

  it("explains missing inventory for non-demo routes", () => {
    const msg = explainEmptySearch({
      parsed: {
        originAirport: "SFO",
        destinationCity: "Seattle",
        destinationAirport: "SEA",
        startDate: "2026-09-08",
        endDate: "2026-09-10",
        purpose: "Seattle trip",
        proximityPreferred: true,
        rawQuery: "seattle",
      },
      flightCount: 0,
      hotelCount: 0,
    });
    assert.match(msg, /SFO/);
    assert.match(msg, /no flights/i);
    assert.match(msg, /no hotels/i);
    assert.match(msg, /Las Vegas|demo/i);
  });
});
