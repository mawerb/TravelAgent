import type { ScoreBreakdown } from "@/types";

export const RANK_WEIGHTS = {
  policyCompliance: 0.35,
  preferenceSimilarity: 0.25,
  proximityScore: 0.2,
  priceScore: 0.1,
  historicalFeedbackScore: 0.1,
} as const;

export function proximityScore(distanceMiles: number, maxMiles: number): number {
  if (distanceMiles <= 0) return 1;
  if (distanceMiles >= maxMiles) return 0.2;
  return Math.max(0.2, 1 - distanceMiles / maxMiles);
}

export function priceScore(totalCents: number, allowanceCents: number): number {
  if (allowanceCents <= 0) return 0.5;
  if (totalCents <= allowanceCents) {
    const ratio = totalCents / allowanceCents;
    return 0.7 + 0.3 * (1 - ratio);
  }
  const over = (totalCents - allowanceCents) / allowanceCents;
  return Math.max(0, 0.5 - over);
}

export function computeScores(input: {
  policyCompliance: number;
  preferenceSimilarity: number;
  distanceMiles: number;
  conferenceRadiusMiles: number;
  totalCents: number;
  allowanceCents: number;
  historicalFeedbackScore: number;
  /** When set in DEMO_MODE for the hero path, force match percent */
  forceMatchPercent?: number;
}): ScoreBreakdown {
  const prox = proximityScore(input.distanceMiles, input.conferenceRadiusMiles);
  const price = priceScore(input.totalCents, input.allowanceCents);

  const finalScore =
    input.policyCompliance * RANK_WEIGHTS.policyCompliance +
    input.preferenceSimilarity * RANK_WEIGHTS.preferenceSimilarity +
    prox * RANK_WEIGHTS.proximityScore +
    price * RANK_WEIGHTS.priceScore +
    input.historicalFeedbackScore * RANK_WEIGHTS.historicalFeedbackScore;

  const matchPercent =
    input.forceMatchPercent ?? Math.round(finalScore * 100);

  return {
    policyCompliance: input.policyCompliance,
    preferenceSimilarity: input.preferenceSimilarity,
    proximityScore: prox,
    priceScore: price,
    historicalFeedbackScore: input.historicalFeedbackScore,
    finalScore,
    matchPercent,
  };
}
