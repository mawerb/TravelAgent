"use server";

import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { getDemoSession } from "@/lib/session";
import { dollarsToCents, formatUsd } from "@/lib/money";
import type {
  EmployeeProfile,
  PolicySuggestion,
  TravelPolicy,
} from "@/types";
import { revalidatePath } from "next/cache";

export async function dismissSuggestionAction(id: string) {
  const db = await getDb();
  const { organization } = await getDemoSession();
  await col<PolicySuggestion>(db, "policySuggestions").updateOne(
    { _id: id, organizationId: organization._id },
    { $set: { status: "dismissed", updatedAt: new Date().toISOString() } },
  );
  revalidatePath("/insights");
  revalidatePath("/approvals");
  return { ok: true as const };
}

export async function updateSuggestionAction(input: {
  id: string;
  recommendation: string;
  topic: string;
  currentPolicy: string;
  proposedChanges: PolicySuggestion["proposedChanges"];
}) {
  const db = await getDb();
  const { organization } = await getDemoSession();
  await col<PolicySuggestion>(db, "policySuggestions").updateOne(
    { _id: input.id, organizationId: organization._id, status: "open" },
    {
      $set: {
        recommendation: input.recommendation.trim(),
        topic: input.topic.trim(),
        currentPolicy: input.currentPolicy.trim(),
        proposedChanges: input.proposedChanges,
        updatedAt: new Date().toISOString(),
      },
    },
  );
  revalidatePath("/insights");
  revalidatePath("/approvals");
  return { ok: true as const };
}

/** Apply edited suggestion into the active org policy (human-in-the-loop). */
export async function applySuggestionAction(id: string) {
  const db = await getDb();
  const { organization } = await getDemoSession();
  const suggestion = await col<PolicySuggestion>(db, "policySuggestions").findOne({
    _id: id,
    organizationId: organization._id,
  });
  if (!suggestion || suggestion.status !== "open") {
    return { ok: false as const, error: "Open suggestion not found" };
  }

  const active = await col<TravelPolicy>(db, "travelPolicies").findOne({
    organizationId: organization._id,
    status: "active",
  });
  if (!active) return { ok: false as const, error: "No active policy" };

  const patch = suggestion.proposedChanges ?? {};
  const now = new Date().toISOString();
  const nextRules = structuredClone(active.rules);

  if (patch.standardMaxCents != null) {
    nextRules.hotels.standardMaxCents = patch.standardMaxCents;
  }
  if (patch.cityCapsCents) {
    nextRules.hotels.cityCapsCents = {
      ...nextRules.hotels.cityCapsCents,
      ...patch.cityCapsCents,
    };
  }
  if (patch.conferenceRadiusMiles != null) {
    nextRules.hotels.conferenceRadiusMiles = patch.conferenceRadiusMiles;
  }
  if (patch.conferenceExceedPercent != null) {
    nextRules.hotels.conferenceExceedPercent = patch.conferenceExceedPercent;
  }
  if (patch.managerApprovalAboveCents != null) {
    nextRules.approval.managerApprovalAboveCents =
      patch.managerApprovalAboveCents;
  }
  if (patch.economyUnderHours != null) {
    nextRules.flights.economyUnderHours = patch.economyUnderHours;
    nextRules.flights.premiumEconomyOverHours = patch.economyUnderHours;
  }

  const newPolicy: TravelPolicy = {
    ...active,
    _id: `policy_applied_${Date.now()}`,
    status: "active",
    source: `Manager applied: ${suggestion.topic}`,
    rules: nextRules,
    createdAt: now,
    updatedAt: now,
  };

  await col<TravelPolicy>(db, "travelPolicies").updateMany(
    { organizationId: organization._id, status: "active" },
    { $set: { status: "draft" } },
  );
  await col<TravelPolicy>(db, "travelPolicies").insertOne(newPolicy);
  await col<PolicySuggestion>(db, "policySuggestions").updateOne(
    { _id: id },
    {
      $set: {
        status: "applied",
        appliedAt: now,
        updatedAt: now,
        currentPolicy: summarizeHotelCaps(nextRules),
      },
    },
  );

  revalidatePath("/insights");
  revalidatePath("/approvals");
  revalidatePath("/policy");
  return { ok: true as const, policyId: newPolicy._id };
}

function summarizeHotelCaps(rules: TravelPolicy["rules"]) {
  const cities = Object.entries(rules.hotels.cityCapsCents)
    .slice(0, 3)
    .map(([c, cents]) => `${c} ${formatUsd(cents)}`)
    .join(", ");
  return `Standard ${formatUsd(rules.hotels.standardMaxCents)}/night${cities ? ` · ${cities}` : ""}`;
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
  const { organization } = await getDemoSession();
  const now = new Date().toISOString();
  const policy: TravelPolicy = {
    _id: `policy_survey_${Date.now()}`,
    organizationId: organization._id,
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
    { organizationId: organization._id, status: "active" },
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
  const { employee } = await getDemoSession();
  await col<EmployeeProfile>(db, "employeeProfiles").updateOne(
    { employeeId: employee._id },
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
