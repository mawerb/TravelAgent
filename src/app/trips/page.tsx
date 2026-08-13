export const dynamic = "force-dynamic";

import Link from "next/link";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { listBookings } from "@/lib/data/bookings";
import { getDemoSession } from "@/lib/session";
import { formatUsd } from "@/lib/money";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestFeedbackSmsButton } from "@/components/trips/request-feedback-sms-button";
import type { Booking } from "@/types";

function TripCard({ booking }: { booking: Booking }) {
  const today = new Date().toISOString().slice(0, 10);
  const tone =
    booking.policyStatus === "compliant"
      ? "compliant"
      : booking.policyStatus === "exception"
        ? "exception"
        : "out_of_policy";
  const showFeedbackCta = booking.state === "CONFIRMED";
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:ring-1 hover:ring-white/15">
      <Link href={`/trips/${booking._id}`} className="block">
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
          <p className="mt-3 text-sm font-medium text-emerald-300">
            Trip complete — open for feedback →
          </p>
        ) : null}
      </Link>
      {showFeedbackCta ? (
        <div className="mt-4 border-t border-white/8 pt-4">
          <RequestFeedbackSmsButton bookingId={booking._id} />
        </div>
      ) : null}
    </div>
  );
}

export default async function TripsPage() {
  await ensureDemoSeeded();
  const { employee } = await getDemoSession();
  const bookings = await listBookings(employee._id);
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
          Upcoming, past, and cancelled travel. Use{" "}
          <span className="text-zinc-300">Send feedback SMS</span> to trigger
          the post-trip Twilio loop.
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
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
