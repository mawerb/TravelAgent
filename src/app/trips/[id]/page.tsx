export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackForm } from "@/components/trips/feedback-form";
import { StatusPill } from "@/components/ui/status-pill";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { getBooking } from "@/lib/data/bookings";
import { formatUsd } from "@/lib/money";
import { formatMiles } from "@/lib/geo";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureDemoSeeded();
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const isPast = booking.endDate < today;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/trips" className="text-sm text-muted-foreground hover:underline">
          ← Trips
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {booking.originCity} → {booking.destinationCity}
            </h1>
            <p className="text-muted-foreground">{booking.purpose}</p>
          </div>
          <StatusPill
            tone={
              booking.policyStatus === "compliant" ? "compliant" : "exception"
            }
          >
            {booking.policyStatus === "compliant" ? "In policy" : "Exception"}
          </StatusPill>
        </div>
      </div>

      <ol className="relative space-y-4 border-l border-border pl-6">
        <TimelineItem title="Outbound flight" detail={`${booking.flight.airline} · ${booking.flight.departTime}–${booking.flight.arriveTime} · Confirmation ${booking.flight.confirmation ?? "—"}`} />
        <TimelineItem title="Hotel check-in" detail={`${booking.hotel.name} · ${formatMiles(booking.hotel.distanceMiles)} from venue · Confirmation ${booking.hotel.confirmation ?? "—"}`} />
        <TimelineItem title="Stay" detail={`${booking.startDate} → ${booking.endDate}`} />
        <TimelineItem title="Return" detail={`Home via ${booking.flight.airline}`} />
        <TimelineItem title="Total charged" detail={`${formatUsd(booking.totalCents)} · Acme Corporate Travel ·••• ${booking.paymentLast4}`} />
      </ol>

      {isPast ? (
        <FeedbackForm bookingId={booking._id} hotelBrand={booking.hotel.brand} />
      ) : null}
    </div>
  );
}

function TimelineItem({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="relative">
      <span className="absolute -left-[1.9rem] top-1 size-3 rounded-full bg-stone-900 ring-4 ring-[var(--canvas)]" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </li>
  );
}
