import type { Db } from "mongodb";
import type {
  CompanyBudgetLedger,
  Employee,
  EmployeeProfile,
  Organization,
  TravelPolicy,
} from "@/types";
import { col } from "@/lib/db/collections";
import { DEMO_ORGS } from "@/lib/demo-orgs";
import { dollarsToCents } from "@/lib/money";
import { ALEX_EMBEDDING } from "@/lib/vector";

/** Upsert the 5 switchable demo orgs, employees, policies, profiles, and ledgers. */
export async function upsertAllDemoOrgs(db: Db): Promise<void> {
  const now = new Date().toISOString();
  for (const def of DEMO_ORGS) {
    await col<Organization>(db, "organizations").updateOne(
      { _id: def.organization._id },
      { $set: def.organization },
      { upsert: true },
    );
    await col<Employee>(db, "employees").updateOne(
      { _id: def.employee._id },
      { $set: def.employee },
      { upsert: true },
    );
    await col<TravelPolicy>(db, "travelPolicies").updateMany(
      { organizationId: def.organization._id, _id: { $ne: def.policy._id } },
      { $set: { status: "draft" } },
    );
    await col<TravelPolicy>(db, "travelPolicies").updateOne(
      { _id: def.policy._id },
      { $set: { ...def.policy, updatedAt: now } },
      { upsert: true },
    );
    await col<EmployeeProfile>(db, "employeeProfiles").updateOne(
      { employeeId: def.employee._id },
      {
        $setOnInsert: {
          _id: `profile_${def.employee._id}`,
          employeeId: def.employee._id,
          organizationId: def.organization._id,
          homeAirport: def.employee.homeAirport,
          preferredAirlines: def.policy.rules.flights.preferredAirlines,
          seat: "aisle" as const,
          preferredHotelBrands: ["Hilton", "Marriott"],
          typicalBehavior: "proximity_first" as const,
          behaviorExplanation:
            "You usually choose hotels closer to your destination even when they cost slightly more.",
          inferredPreferences: [
            "Morning departures",
            "Nonstop flights strongly preferred",
            "Free hotel cancellation",
          ],
          confidence: 0.85,
          tripsAnalyzed: 8,
          feedbackCount: 3,
          embedding: ALEX_EMBEDDING,
        },
      },
      { upsert: true },
    );
    await col<CompanyBudgetLedger>(db, "companyBudgetLedger").updateOne(
      { _id: def.ledgerId },
      {
        $set: {
          _id: def.ledgerId,
          organizationId: def.organization._id,
          annualBudgetCents: dollarsToCents(100_000),
          spentCents: dollarsToCents(40_496),
          reservedCents: 0,
          availableCents: dollarsToCents(58_420),
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }
}
