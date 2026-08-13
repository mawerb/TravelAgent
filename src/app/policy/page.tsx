export const dynamic = "force-dynamic";

import { PolicyUploadButton } from "@/components/policy/policy-upload";
import { PolicySurvey } from "@/components/policy/policy-survey";
import { StatusPill } from "@/components/ui/status-pill";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { getDemoOrgDef } from "@/lib/demo-orgs";
import { getDemoSession } from "@/lib/session";
import { formatUsd } from "@/lib/money";
import type { TravelPolicy } from "@/types";

export default async function PolicyPage() {
  await ensureDemoSeeded();
  const { organization } = await getDemoSession();
  const orgDef = getDemoOrgDef(organization._id);
  const db = await getDb();
  const policy = await col<TravelPolicy>(db, "travelPolicies").findOne({
    organizationId: organization._id,
    status: "active",
  });

  if (!policy) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Company Policy
          </h1>
        </header>
        <PolicySurvey />
      </div>
    );
  }

  const r = policy.rules;
  const cityCaps = Object.entries(r.hotels.cityCapsCents).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-sky-300/80 uppercase">
            {organization.name}
          </p>
          <h1 className="font-heading mt-1 text-3xl font-semibold tracking-tight">
            Travel Policy
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill tone="compliant">Active</StatusPill>
            <span className="text-sm text-muted-foreground">{policy.source}</span>
          </div>
        </div>
        <PolicyUploadButton />
      </header>

      <div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 px-6 py-5">
        <p className="text-xs font-semibold tracking-wide text-sky-300/90 uppercase">
          How {organization.name} travels
        </p>
        <p className="mt-2 text-base leading-relaxed text-zinc-100">
          {orgDef.policyTrope}
        </p>
        <p className="mt-3 text-sm text-zinc-400">
          Approvals go to {orgDef.manager.name}, {orgDef.manager.title}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RuleCard title="Flights">
          <li>Economy required under {r.flights.economyUnderHours} hours</li>
          <li>
            Premium economy allowed over {r.flights.premiumEconomyOverHours}{" "}
            hours
          </li>
          <li>
            Business class{" "}
            {r.flights.businessRequiresVpApproval
              ? "requires VP approval"
              : "permitted"}
          </li>
          <li>
            Preferred airlines: {r.flights.preferredAirlines.join(", ")}
          </li>
          {r.flights.refundableRequired ? (
            <li>Refundable fares required</li>
          ) : null}
        </RuleCard>
        <RuleCard title="Hotels">
          <li>
            Standard maximum: {formatUsd(r.hotels.standardMaxCents)}/night
          </li>
          {cityCaps.map(([city, cents]) => (
            <li key={city}>
              {titleCity(city)}: {formatUsd(cents)}/night
            </li>
          ))}
          <li>
            Conference travel may exceed normal limit by{" "}
            {r.hotels.conferenceExceedPercent}%
          </li>
          <li>
            Lodging must be within {r.hotels.conferenceRadiusMiles} mile
            {r.hotels.conferenceRadiusMiles === 1 ? "" : "s"} of conference
            venue where possible
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
            manager approval ({orgDef.manager.name})
          </li>
          <li>
            {r.approval.outOfPolicyRequiresJustification
              ? "Out-of-policy bookings require justification and manager review"
              : "Out-of-policy bookings blocked"}
          </li>
        </RuleCard>
      </div>
    </div>
  );
}

function titleCity(key: string) {
  return key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function RuleCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        {children}
      </ul>
    </div>
  );
}
