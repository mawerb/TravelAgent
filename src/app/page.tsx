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
  const { employee, organization } = await getDemoSession();
  const firstName = employee.name.split(" ")[0];
  const upcoming = await getUpcomingBooking(employee._id);

  return (
    <div className="relative -mx-4 -mt-8 min-h-[calc(100vh-4rem)] overflow-hidden px-4 pb-16 pt-10 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="soar-atmosphere" aria-hidden />

      <div className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center">
        <p className="soar-rise font-heading text-sm font-semibold tracking-[0.22em] text-sky-300/90 uppercase">
          Expense Agent
        </p>
        <h1 className="soar-rise-delay font-heading mt-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl sm:leading-[1.05]">
          Where to next?
        </h1>
        <p className="soar-rise-delay mt-4 max-w-xl text-base text-zinc-400 sm:text-lg">
          {greetingForNow()}, {firstName}. Plan policy-clean trips for{" "}
          <span className="text-zinc-200">{organization.name}</span> in one
          search.
        </p>

        <div className="soar-rise-delay mt-10">
          <CommandBox variant="hero" autoFocus />
        </div>
      </div>

      <section className="relative mx-auto mt-16 max-w-3xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            Upcoming trip
          </h2>
          <Link
            href="/trips"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-sky-300"
          >
            All trips <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {upcoming ? (
          <UpcomingTripCard booking={upcoming} />
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center">
            <p className="font-medium text-zinc-200">No upcoming trips yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Search above to plan your next conference or customer visit.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
