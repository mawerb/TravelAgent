/**
 * Preference similarity abstraction.
 * DEMO_MODE: cosine over a small handcrafted feature vector.
 * Upgrade path: Atlas Vector Search $vectorSearch on the same embedding field.
 */

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Feature order: united, alaska, aisle, hilton, marriott, morning, nonstop, freeCancel, proximity, avoidLate */
export function buildItineraryEmbedding(input: {
  airline: string;
  departHour: number;
  stops: number;
  hotelBrand: string;
  freeCancellation: boolean;
  distanceMiles: number;
}): number[] {
  const airline = input.airline.toLowerCase();
  const brand = input.hotelBrand.toLowerCase();
  return [
    airline.includes("united") ? 1 : 0,
    airline.includes("alaska") ? 1 : 0,
    1, // aisle assumed preferred when matching Alex
    brand.includes("hilton") ? 1 : 0,
    brand.includes("marriott") ? 1 : 0,
    input.departHour < 12 ? 1 : 0,
    input.stops === 0 ? 1 : 0,
    input.freeCancellation ? 1 : 0,
    Math.max(0, 1 - input.distanceMiles),
    input.departHour < 21 ? 1 : 0,
  ];
}

export function preferenceSimilarity(
  employeeEmbedding: number[],
  candidateEmbedding: number[],
): number {
  // Map cosine [-1,1] → [0,1]
  const cos = cosineSimilarity(employeeEmbedding, candidateEmbedding);
  return Math.max(0, Math.min(1, (cos + 1) / 2));
}

/** Alex seed embedding — high United/Hilton/proximity/aisle/morning/nonstop */
export const ALEX_EMBEDDING = [1, 0.6, 1, 1, 0.7, 1, 1, 1, 1, 1];
