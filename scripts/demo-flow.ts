import { ensureDemoSeeded } from "../src/lib/db/ensure-seeded";
import { runTravelSearch } from "../src/lib/agents";
import { BookingOrchestrator } from "../src/lib/booking";
import { getDb } from "../src/lib/db/client";
import { col } from "../src/lib/db/collections";
import { CANDIDATE_VEGAS_HERO, LEDGER_ACME_ID } from "../src/lib/session";
import type { CompanyBudgetLedger } from "../src/types";
import { formatUsd } from "../src/lib/money";

async function main() {
  process.env.DEMO_MODE = "true";
  await ensureDemoSeeded();

  const db = await getDb();
  const before = await col<CompanyBudgetLedger>(db, "companyBudgetLedger").findOne({
    _id: LEDGER_ACME_ID,
  });
  console.log("Budget before:", formatUsd(before!.availableCents));

  const result = await runTravelSearch(
    "I need to attend MongoDB.local in Las Vegas Sep 22–25. Keep me close to the venue and I prefer United.",
  );

  console.log("Match:", result.recommended.scores.matchPercent + "%");
  console.log("Total:", formatUsd(result.recommended.totalCents));
  console.log("Allowance:", formatUsd(result.recommended.allowanceCents));
  console.log("Savings:", formatUsd(result.recommended.savingsCents));
  console.log("Distance:", result.recommended.hotel.distanceMiles.toFixed(1), "mi");
  console.log("Candidate:", result.recommended._id);
  console.log("Alts:", result.alternatives.map((a) => a.label).join(", "));

  if (result.recommended._id !== CANDIDATE_VEGAS_HERO) {
    throw new Error(`Expected ${CANDIDATE_VEGAS_HERO}, got ${result.recommended._id}`);
  }
  if (result.recommended.scores.matchPercent !== 96) {
    throw new Error("Expected 96% match");
  }
  if (result.recommended.totalCents !== 108400) {
    throw new Error(`Expected $1084, got ${result.recommended.totalCents}`);
  }

  const booked = await BookingOrchestrator({
    candidateId: result.recommended._id,
    bookingAttemptId: `ba_demo_${Date.now()}`,
  });
  if (booked.kind !== "booked") {
    throw new Error(`Expected booked, got ${booked.kind}`);
  }
  console.log("Booking state:", booked.booking.state);
  console.log("Flight conf:", booked.booking.flight.confirmation);
  console.log("Hotel conf:", booked.booking.hotel.confirmation);

  const after = await col<CompanyBudgetLedger>(db, "companyBudgetLedger").findOne({
    _id: LEDGER_ACME_ID,
  });
  console.log("Budget after:", formatUsd(after!.availableCents));
  if (after!.availableCents !== before!.availableCents - 108400) {
    throw new Error("Ledger did not decrement correctly");
  }

  console.log("DEMO FLOW OK");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
