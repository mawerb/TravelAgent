import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hotelMaxForCity, normalizeCityKey, validateItinerary } from "./policy";
import { dollarsToCents } from "./money";
import type { TravelPolicy } from "@/types";

const policy: TravelPolicy = {
  _id: "p",
  organizationId: "org_acme",
  status: "active",
  source: "test",
  createdAt: "",
  updatedAt: "",
  rules: {
    flights: {
      economyUnderHours: 6,
      premiumEconomyOverHours: 6,
      businessRequiresVpApproval: true,
      preferredAirlines: ["United"],
      refundableRequired: false,
    },
    hotels: {
      standardMaxCents: dollarsToCents(250),
      cityCapsCents: { "las vegas": dollarsToCents(300) },
      conferenceExceedPercent: 15,
      conferenceRadiusMiles: 1,
    },
    transportation: {
      ridesharePermitted: true,
      rentalRequiresJustification: true,
    },
    approval: {
      managerApprovalAboveCents: dollarsToCents(2500),
      outOfPolicyRequiresJustification: true,
    },
  },
};

describe("policy", () => {
  it("normalizes city keys with state suffixes", () => {
    assert.equal(normalizeCityKey("Las Vegas, NV"), "las vegas");
    assert.equal(normalizeCityKey("Washington, DC"), "washington");
  });

  it("allows conference bump on hotel max", () => {
    const max = hotelMaxForCity(policy.rules, "Las Vegas, NV", true);
    assert.equal(max, Math.round(dollarsToCents(300) * 1.15));
  });

  it("marks compliant Vegas demo itinerary", () => {
    const result = validateItinerary({
      policy,
      parsed: {
        originAirport: "SFO",
        destinationCity: "Las Vegas",
        destinationAirport: "LAS",
        startDate: "2026-09-22",
        endDate: "2026-09-25",
        purpose: "MongoDB.local",
        venueName: "MongoDB.local",
        proximityPreferred: true,
        rawQuery: "demo",
      },
      flight: {
        id: "f",
        airline: "United",
        origin: "SFO",
        destination: "LAS",
        departTime: "09:10",
        arriveTime: "10:42",
        durationMinutes: 92,
        stops: 0,
        cabin: "economy",
        priceCents: dollarsToCents(346),
        inventory: 1,
      },
      hotelNightlyCents: dollarsToCents(246),
      hotelDistanceMiles: 0.3,
      totalCents: dollarsToCents(1084),
      nights: 3,
    });
    assert.equal(result.compliant, true);
    assert.equal(result.status, "compliant");
  });
});
