"use server";

import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { ORG_ACME_ID } from "@/lib/session";
import { dollarsToCents } from "@/lib/money";
import type { EmployeeProfile, TravelPolicy } from "@/types";
import { revalidatePath } from "next/cache";

export async function dismissSuggestionAction(id: string) {
  const db = await getDb();
  await col<{ _id: string; status: string }>(db, "policySuggestions").updateOne(
    { _id: id },
    { $set: { status: "dismissed" } },
  );
  revalidatePath("/insights");
  return { ok: true as const };
}

export async function reviewSuggestionAction(id: string) {
  const db = await getDb();
  await col<{ _id: string; status: string }>(db, "policySuggestions").updateOne(
    { _id: id },
    { $set: { status: "reviewed" } },
  );
  revalidatePath("/insights");
  return { ok: true as const };
}

export async function createPolicyFromSurveyAction(input: {
  hotelLimitDollars: number;
  cabin: string;
  businessWhen: string;
  preferredAirlines: string;
  requireNearVenue: boolean;
  distanceMiles: number;
  managerApprovalDollars: number;
  refundableRequired: boolean;
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const policy: TravelPolicy = {
    _id: `policy_survey_${Date.now()}`,
    organizationId: ORG_ACME_ID,
    status: "active",
    source: "Policy survey",
    rules: {
      flights: {
        economyUnderHours: 6,
        premiumEconomyOverHours: 6,
        businessRequiresVpApproval: /vp|approval/i.test(input.businessWhen),
        preferredAirlines: input.preferredAirlines
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        refundableRequired: input.refundableRequired,
      },
      hotels: {
        standardMaxCents: dollarsToCents(input.hotelLimitDollars),
        cityCapsCents: {},
        conferenceExceedPercent: 15,
        conferenceRadiusMiles: input.requireNearVenue ? input.distanceMiles : 5,
      },
      transportation: {
        ridesharePermitted: true,
        rentalRequiresJustification: true,
      },
      approval: {
        managerApprovalAboveCents: dollarsToCents(input.managerApprovalDollars),
        outOfPolicyRequiresJustification: true,
      },
    },
    createdAt: now,
    updatedAt: now,
  };
  await col<TravelPolicy>(db, "travelPolicies").updateMany(
    { organizationId: ORG_ACME_ID, status: "active" },
    { $set: { status: "draft" } },
  );
  await col<TravelPolicy>(db, "travelPolicies").insertOne(policy);
  revalidatePath("/policy");
  return { ok: true as const, policyId: policy._id };
}

export async function updateProfileAction(input: {
  homeAirport: string;
  preferredAirlines: string[];
  seat: "aisle" | "window" | "middle";
  preferredHotelBrands: string[];
}) {
  const db = await getDb();
  await col<EmployeeProfile>(db, "employeeProfiles").updateOne(
    { employeeId: "emp_alex" },
    {
      $set: {
        homeAirport: input.homeAirport,
        preferredAirlines: input.preferredAirlines,
        seat: input.seat,
        preferredHotelBrands: input.preferredHotelBrands,
      },
    },
  );
  revalidatePath("/profile");
  return { ok: true as const };
}
