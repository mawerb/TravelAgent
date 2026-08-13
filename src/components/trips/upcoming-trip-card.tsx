import Link from "next/link";
import type { Booking } from "@/types";
import { StatusPill } from "@/components/ui/status-pill";
import { formatUsd } from "@/lib/money";
import { formatMiles } from "@/lib/geo";

function formatRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  return `${s.toLocaleDateString("en-US", opts)}–${e.toLocaleDateString("en-US", { day: "numeric" })}`;
}

export function UpcomingTripCard({ booking }: { booking: Booking }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm ring-1 ring-black/[0.03]">
      <div className="bg-gradient-to-br from-stone-900 to-stone-700 px-6 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-white/70">Upcoming</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight">
              {booking.originCity} → {booking.destinationCity}
            </h3>
            <p className="mt-1 text-white/80">{booking.purpose}</p>
          </div>
          <StatusPill tone="compliant" className="bg-emerald-400/20 text-emerald-50 ring-emerald-300/30">
            Booked · In policy
          </StatusPill>
        </div>
        <p className="mt-4 text-sm text-white/70">
          {formatRange(booking.startDate, booking.endDate)}
        </p>
      </div>
      <div className="grid gap-4 px-6 py-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Flight
          </p>
          <p className="mt-1 font-medium">{booking.flight.airline} Airlines</p>
          <p className="text-sm text-muted-foreground">
            {booking.flight.origin} → {booking.flight.destination}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Hotel
          </p>
          <p className="mt-1 font-medium">{booking.hotel.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatMiles(booking.hotel.distanceMiles)} from venue
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Total
          </p>
          <p className="mt-1 text-xl font-semibold">
            {formatUsd(booking.totalCents)}
          </p>
          <Link
            href={`/trips/${booking._id}`}
            className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:underline"
          >
            View itinerary
          </Link>
        </div>
      </div>
    </div>
  );
}
