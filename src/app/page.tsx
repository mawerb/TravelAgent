export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CommandBox } from "@/components/agent/command-box";
import { UpcomingTripCard } from "@/components/trips/upcoming-trip-card";
import { getUpcomingBooking } from "@/lib/data/bookings";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { greetingForNow, getDemoSession } from "@/lib/session";

export default async function HomePage() {
  await ensureDemoSeeded();
  const { employee } = getDemoSession();
  const firstName = employee.name.split(" ")[0];
  const upcoming = await getUpcomingBooking(employee._id);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {greetingForNow()}, {firstName}
        </h1>
        <p className="text-lg text-muted-foreground">
          Where do you need to be next?
        </p>
      </header>

      <CommandBox />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Upcoming trip
          </h2>
          <Link
            href="/trips"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            All trips <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {upcoming ? (
          <UpcomingTripCard booking={upcoming} />
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-10 text-center">
            <p className="font-medium">No upcoming trips yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask the travel agent to plan your next conference or customer
              visit.
            </p>
            <Link
              href="/agent"
              className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:underline"
            >
              Ask Travel Agent
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
