export const dynamic = "force-dynamic";

import Link from "next/link";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { listBookings } from "@/lib/data/bookings";
import { EMP_ALEX_ID } from "@/lib/session";
import { formatUsd } from "@/lib/money";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Booking } from "@/types";

function TripCard({ booking }: { booking: Booking }) {
  const today = new Date().toISOString().slice(0, 10);
  const tone =
    booking.policyStatus === "compliant"
      ? "compliant"
      : booking.policyStatus === "exception"
        ? "exception"
        : "out_of_policy";
  return (
    <Link
      href={`/trips/${booking._id}`}
      className="block rounded-3xl border border-border bg-white p-5 shadow-sm transition hover:ring-1 hover:ring-stone-300"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">
            {booking.originCity} → {booking.destinationCity}
          </h3>
          <p className="text-sm text-muted-foreground">{booking.purpose}</p>
        </div>
        <StatusPill tone={tone}>
          {booking.policyStatus === "compliant"
            ? "In policy"
            : booking.policyStatus === "exception"
              ? "Exception"
              : "Out of policy"}
        </StatusPill>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Dates · </span>
          {booking.startDate} → {booking.endDate}
        </p>
        <p>
          <span className="text-muted-foreground">Amount · </span>
          {formatUsd(booking.totalCents)}
        </p>
        <p>
          <span className="text-muted-foreground">Flight · </span>
          {booking.flight.airline}
          {booking.flight.confirmation
            ? ` · ${booking.flight.confirmation}`
            : ""}
        </p>
        <p>
          <span className="text-muted-foreground">Hotel · </span>
          {booking.hotel.name}
        </p>
      </div>
      {booking.endDate < today ? (
        <p className="mt-3 text-sm font-medium text-emerald-700">
          How was your trip? Leave feedback →
        </p>
      ) : null}
    </Link>
  );
}

export default async function TripsPage() {
  await ensureDemoSeeded();
  const bookings = await listBookings(EMP_ALEX_ID);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter(
    (b) => b.state === "CONFIRMED" && b.endDate >= today,
  );
  const past = bookings.filter(
    (b) => b.state === "CONFIRMED" && b.endDate < today,
  );
  const cancelled = bookings.filter((b) => b.state === "FAILED");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Trips</h1>
        <p className="text-muted-foreground">
          Upcoming, past, and cancelled travel.
        </p>
      </header>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length ? (
            upcoming.map((b) => <TripCard key={b._id} booking={b} />)
          ) : (
            <Empty label="No upcoming trips. Ask the travel agent to book one." />
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-4 space-y-3">
          {past.map((b) => (
            <TripCard key={b._id} booking={b} />
          ))}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-4 space-y-3">
          {cancelled.length ? (
            cancelled.map((b) => <TripCard key={b._id} booking={b} />)
          ) : (
            <Empty label="No cancelled trips." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
