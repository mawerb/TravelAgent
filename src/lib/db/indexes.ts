import type { Db } from "mongodb";

export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("hotels").createIndex({ location: "2dsphere" });
  await db.collection("bookings").createIndex(
    { bookingAttemptId: 1 },
    { unique: true },
  );
  await db.collection("bookings").createIndex({ employeeId: 1, startDate: -1 });
  await db.collection("expenses").createIndex({ bookingId: 1 });
  await db.collection("tripCandidates").createIndex({ tripRequestId: 1 });
  await db.collection("feedback").createIndex({ employeeId: 1 });
  await db.collection("policySuggestions").createIndex({ organizationId: 1 });

  // ponytail: Atlas Vector Search index creation requires Atlas Search API / UI.
  // DEMO_MODE uses in-process cosine similarity (src/lib/vector.ts). Upgrade path:
  // create a vectorSearch index on employeeProfiles.embedding / tripCandidates.embedding
  // and swap preferenceSimilarity() to $vectorSearch when available.
}
