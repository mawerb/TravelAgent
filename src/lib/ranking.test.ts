import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeScores, RANK_WEIGHTS } from "./ranking";

describe("ranking", () => {
  it("uses fixed weights totaling 1", () => {
    const sum = Object.values(RANK_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.equal(sum, 1);
  });

  it("forces demo hero match percent", () => {
    const scores = computeScores({
      policyCompliance: 1,
      preferenceSimilarity: 0.94,
      distanceMiles: 0.3,
      conferenceRadiusMiles: 1,
      totalCents: 108400,
      allowanceCents: 128000,
      historicalFeedbackScore: 0.95,
      forceMatchPercent: 96,
    });
    assert.equal(scores.matchPercent, 96);
  });
});
