import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hotelUrl, googleFlightsUrl } from "./links";
import { buildTripConfirmation, reviseParsedTrip } from "./clarify";

describe("links", () => {
  it("embeds hotel check-in and check-out on Hilton deep link", () => {
    const url = hotelUrl({
      hotelId: "hotel_hilton_vegas_near",
      name: "Hilton Grand Vacations Club Elara",
      checkIn: "2026-09-22",
      checkOut: "2026-09-25",
    });
    assert.match(url, /arrivalDate=2026-09-22/);
    assert.match(url, /departureDate=2026-09-25/);
  });

  it("embeds dates on Google Hotels fallback", () => {
    const url = hotelUrl({
      name: "Unknown Inn",
      city: "Las Vegas",
      checkIn: "2026-09-22",
      checkOut: "2026-09-25",
    });
    assert.match(url, /dates=2026-09-22%2C2026-09-25/);
  });

  it("can include return date on Google Flights", () => {
    const url = googleFlightsUrl({
      origin: "SFO",
      destination: "LAS",
      date: "2026-09-22",
      returnDate: "2026-09-25",
      airline: "United",
    });
    assert.match(url, /returning%202026-09-25/);
  });
});

describe("clarify", () => {
  it("asks follow-up questions that include the trip dates", () => {
    const { summary, questions } = buildTripConfirmation({
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
});
