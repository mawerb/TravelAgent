import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatMiles, haversineMiles, milesToMeters } from "./geo";

describe("geo", () => {
  it("converts miles to meters", () => {
    assert.ok(Math.abs(milesToMeters(1) - 1609.344) < 0.01);
  });

  it("computes short Vegas distances", () => {
    const venue = { type: "Point" as const, coordinates: [-115.1537, 36.1315] as [number, number] };
    const hilton = { type: "Point" as const, coordinates: [-115.1495, 36.1338] as [number, number] };
    const miles = haversineMiles(venue, hilton);
    assert.ok(miles > 0.2 && miles < 0.5, `expected ~0.3 mi, got ${miles}`);
    assert.equal(formatMiles(0.34), "0.3 mi");
  });
});
