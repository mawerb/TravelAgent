export const dynamic = "force-dynamic";

import { ProfileEditor } from "@/components/profile/profile-editor";
import { StatusPill } from "@/components/ui/status-pill";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { EMP_ALEX_ID } from "@/lib/session";
import type { EmployeeProfile } from "@/types";

export default async function ProfilePage() {
  await ensureDemoSeeded();
  const db = await getDb();
  const profile = await col<EmployeeProfile>(db, "employeeProfiles").findOne({
    employeeId: EMP_ALEX_ID,
  });

  if (!profile) {
    return <p>Profile not found. Run seed.</p>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Your Travel Profile
        </h1>
        <p className="text-muted-foreground">
          Built from {profile.tripsAnalyzed} previous trips and{" "}
          {profile.feedbackCount} feedback responses.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <StatusPill tone="info">
          Profile confidence: {Math.round(profile.confidence * 100)}%
        </StatusPill>
        <StatusPill tone="compliant">Preference match model ready</StatusPill>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard label="Home airport" value={profile.homeAirport} />
        <InfoCard
          label="Preferred airlines"
          value={profile.preferredAirlines.join(", ")}
        />
        <InfoCard
          label="Seat"
          value={profile.seat[0]!.toUpperCase() + profile.seat.slice(1)}
        />
        <InfoCard
          label="Preferred hotel brands"
          value={profile.preferredHotelBrands.join(", ")}
        />
      </div>

      <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Typical behavior
        </p>
        <h2 className="mt-1 text-xl font-semibold">Proximity first</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {profile.behaviorExplanation}
        </p>
        <ul className="mt-4 space-y-1.5 text-sm">
          {profile.inferredPreferences.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-stone-400" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      <ProfileEditor
        initial={{
          homeAirport: profile.homeAirport,
          preferredAirlines: profile.preferredAirlines,
          seat: profile.seat,
          preferredHotelBrands: profile.preferredHotelBrands,
        }}
      />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
