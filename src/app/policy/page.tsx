export const dynamic = "force-dynamic";

import { PolicyUploadButton } from "@/components/policy/policy-upload";
import { PolicySurvey } from "@/components/policy/policy-survey";
import { StatusPill } from "@/components/ui/status-pill";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { ORG_ACME_ID } from "@/lib/session";
import { formatUsd } from "@/lib/money";
import type { TravelPolicy } from "@/types";

export default async function PolicyPage() {
  await ensureDemoSeeded();
  const db = await getDb();
  const policy = await col<TravelPolicy>(db, "travelPolicies").findOne({
    organizationId: ORG_ACME_ID,
    status: "active",
  });

  if (!policy) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">
            Company Policy
          </h1>
        </header>
        <PolicySurvey />
      </div>
    );
  }

  const r = policy.rules;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Acme Technologies Travel Policy
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill tone="compliant">Active</StatusPill>
            <span className="text-sm text-muted-foreground">
              Source: {policy.source}
            </span>
          </div>
        </div>
        <PolicyUploadButton />
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <RuleCard title="Flights">
          <li>Economy required under {r.flights.economyUnderHours} hours</li>
          <li>
            Premium economy allowed over {r.flights.premiumEconomyOverHours}{" "}
            hours
          </li>
          <li>Business requires VP approval</li>
          <li>
            Preferred airlines: {r.flights.preferredAirlines.join(", ")}
          </li>
        </RuleCard>
        <RuleCard title="Hotels">
          <li>
            Standard maximum: {formatUsd(r.hotels.standardMaxCents)}/night
          </li>
          <li>
            San Francisco:{" "}
            {formatUsd(r.hotels.cityCapsCents["san francisco"] ?? r.hotels.standardMaxCents)}
            /night
          </li>
          <li>
            New York:{" "}
            {formatUsd(r.hotels.cityCapsCents["new york"] ?? r.hotels.standardMaxCents)}
            /night
          </li>
          <li>
            Conference travel may exceed normal limit by{" "}
            {r.hotels.conferenceExceedPercent}%
          </li>
          <li>
            Lodging must be within {r.hotels.conferenceRadiusMiles} mile of
            conference venue where possible
          </li>
        </RuleCard>
        <RuleCard title="Transportation">
          <li>
            Rideshare{" "}
            {r.transportation.ridesharePermitted ? "permitted" : "not permitted"}
          </li>
          <li>
            Rental car{" "}
            {r.transportation.rentalRequiresJustification
              ? "requires business justification"
              : "permitted"}
          </li>
        </RuleCard>
        <RuleCard title="Approval">
          <li>
            Trips above {formatUsd(r.approval.managerApprovalAboveCents)} require
            manager approval
          </li>
          <li>Out-of-policy bookings require justification</li>
        </RuleCard>
      </div>
    </div>
  );
}

function RuleCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        {children}
      </ul>
    </div>
  );
}
