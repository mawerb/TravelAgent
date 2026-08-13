"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { TripCandidate } from "@/types";
import type { BookingSiteQuote } from "@/lib/booking-sites";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { VENUE_URL } from "@/lib/links";
import { formatUsd } from "@/lib/money";
import { formatMiles } from "@/lib/geo";
import { cn } from "@/lib/utils";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  return `${s.toLocaleDateString("en-US", opts)}–${e.toLocaleDateString("en-US", { day: "numeric" })}`;
}

function BookingSiteList({
  title,
  quotes,
}: {
  title: string;
  quotes: BookingSiteQuote[];
}) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="mt-1.5 divide-y divide-border/70">
        {quotes.map((q) => (
          <li
            key={`${q.kind}-${q.siteId}`}
            className="flex items-center justify-between gap-3 py-1.5 text-sm"
          >
            <ExternalLink href={q.url} className="min-w-0 truncate">
              {q.siteName}
              {q.badge === "cheapest" ? " · cheapest" : null}
              {q.badge === "best" ? " · best" : null}
            </ExternalLink>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatUsd(q.priceCents)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecommendationCard({
  candidate,
  onBook,
  onSeeAlternatives,
}: {
  candidate: TripCandidate;
  onBook: () => void;
  onSeeAlternatives: () => void;
}) {
  const [openWhy, setOpenWhy] = useState(false);
  const [openDebug, setOpenDebug] = useState(false);
  const room = candidate.hotel.room;
  const rates = candidate.hotel.url;
  const listing =
    candidate.hotel.listingUrl &&
    candidate.hotel.listingUrl !== rates
      ? candidate.hotel.listingUrl
      : undefined;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm ring-1 ring-white/5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Recommended for you
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {candidate.flight.origin} → {candidate.flight.destination}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatRange(candidate.startDate, candidate.endDate)} ·{" "}
            {candidate.nights} night{candidate.nights === 1 ? "" : "s"}
          </p>
        </div>
        <StatusPill
          tone={
            candidate.policy.status === "compliant"
              ? "compliant"
              : candidate.policy.status === "exception"
                ? "exception"
                : "out_of_policy"
          }
          className="text-sm px-3 py-1"
        >
          {candidate.scores.matchPercent}% match
          {candidate.policy.status === "out_of_policy"
            ? " · needs approval"
            : candidate.policy.requiresManagerApproval
              ? " · manager"
              : ""}
        </StatusPill>
      </div>

      <div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Flight
          </p>
          <p className="mt-2 text-lg font-medium">{candidate.flight.airline}</p>
          <p className="text-sm text-muted-foreground">
            {candidate.flight.origin} → {candidate.flight.destination}
          </p>
          <p className="mt-1 text-sm">
            Depart {candidate.flight.departTime} · Arrive{" "}
            {candidate.flight.arriveTime}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDuration(candidate.flight.durationMinutes)} ·{" "}
            {candidate.flight.stops === 0
              ? "Nonstop"
              : `${candidate.flight.stops} stop`}{" "}
            ·{" "}
            {candidate.flight.cabin[0]!.toUpperCase()}
            {candidate.flight.cabin.slice(1).replace("_", " ")}
          </p>
          <p className="mt-1 text-sm font-medium">
            {formatUsd(candidate.flightCents)}
          </p>
          {candidate.bookingCompare?.flights?.length ? (
            <BookingSiteList
              title="Flight prices across sites"
              quotes={candidate.bookingCompare.flights}
            />
          ) : candidate.flight.url ? (
            <p className="mt-2">
              <ExternalLink href={candidate.flight.url}>
                View flights for these dates
              </ExternalLink>
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Hotel
          </p>
          <p className="mt-2 text-lg font-medium">{candidate.hotel.name}</p>
          {candidate.hotel.neighborhood ? (
            <p className="text-sm text-muted-foreground">
              {candidate.hotel.neighborhood}
            </p>
          ) : null}
          {candidate.hotel.address ? (
            <p className="text-sm text-muted-foreground">
              {candidate.hotel.address}
            </p>
          ) : null}
          <p className="mt-1 text-sm">
            {formatUsd(candidate.hotel.nightlyRateCents)}/night ·{" "}
            {formatUsd(candidate.hotelCents)} total · {candidate.hotel.stars}{" "}
            stars
          </p>
          <p className="text-sm text-muted-foreground">
            {formatMiles(candidate.hotel.distanceMiles)} from{" "}
            <a
              href={VENUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-700 hover:underline"
            >
              MongoDB.local
            </a>
          </p>

          {room ? (
            <div className="mt-3 rounded-2xl border border-border/80 bg-muted px-3 py-2.5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Room to book
              </p>
              <p className="mt-1 font-medium">{room.name}</p>
              <p className="text-sm text-muted-foreground">
                {room.bedType} · sleeps {room.sleeps}
                {room.breakfastIncluded ? " · breakfast included" : ""}
                {room.refundable ? " · free cancellation" : " · non-refundable"}
              </p>
              {room.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {room.description}
                </p>
              ) : null}
            </div>
          ) : null}

          {candidate.hotel.amenities?.length ? (
            <div className="mt-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Amenities
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {candidate.hotel.amenities.map((a) => (
                  <li
                    key={a}
                    className="rounded-full bg-card px-2.5 py-0.5 text-xs text-zinc-300 ring-1 ring-white/10"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {candidate.bookingCompare?.hotels?.length ? (
            <BookingSiteList
              title="Hotel rates across sites"
              quotes={candidate.bookingCompare.hotels}
            />
          ) : (
            <div className="mt-3 space-y-1">
              {rates ? (
                <p>
                  <ExternalLink href={rates}>
                    Check rates for these dates
                  </ExternalLink>
                </p>
              ) : null}
              {listing ? (
                <p>
                  <ExternalLink href={listing}>View property page</ExternalLink>
                  <span className="ml-2 text-xs text-muted-foreground">
                    shareable · doesn’t expire
                  </span>
                </p>
              ) : null}
            </div>
          )}
          {listing && candidate.bookingCompare?.hotels?.length ? (
            <p className="mt-2">
              <ExternalLink href={listing}>View property page</ExternalLink>
              <span className="ml-2 text-xs text-muted-foreground">
                shareable · doesn’t expire
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 border-t border-border bg-muted px-6 py-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-semibold">
            {formatUsd(candidate.totalCents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Company allowance</p>
          <p className="text-xl font-semibold">
            {formatUsd(candidate.allowanceCents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Savings</p>
          <p className="text-xl font-semibold text-emerald-300">
            {formatUsd(candidate.savingsCents)} below policy allowance
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-6 py-4">
        {candidate.explanationChips.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-400/25"
          >
            <Check className="size-3" />
            {chip}
          </span>
        ))}
      </div>

      <div className="space-y-2 px-6 pb-4">
        <button
          type="button"
          onClick={() => setOpenWhy((v) => !v)}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Why this trip?
          <ChevronDown
            className={cn("size-4 transition", openWhy && "rotate-180")}
          />
        </button>
        {openWhy ? (
          <p className="rounded-2xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            {candidate.whyThisTrip}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setOpenDebug((v) => !v)}
          className="text-xs text-muted-foreground/70 hover:text-muted-foreground"
        >
          Developer · score breakdown
        </button>
        {openDebug ? (
          <pre className="overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100">
            {JSON.stringify(
              {
                weights: {
                  policy: 0.35,
                  preference: 0.25,
                  proximity: 0.2,
                  price: 0.1,
                  feedback: 0.1,
                },
                scores: candidate.scores,
                preferenceMatch: `${Math.round(candidate.scores.preferenceSimilarity * 100)}%`,
                room: candidate.hotel.room,
              },
              null,
              2,
            )}
          </pre>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border px-6 py-5">
        <Button size="lg" className="rounded-xl px-5" onClick={onBook}>
          Book flight + hotel · {formatUsd(candidate.totalCents)}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-xl"
          onClick={onSeeAlternatives}
        >
          See alternatives
        </Button>
      </div>
    </div>
  );
}

export function AlternativeCard({
  candidate,
  onSelect,
}: {
  candidate: TripCandidate;
  onSelect: () => void;
}) {
  const title =
    candidate.label === "lowest_cost"
      ? "Lowest cost"
      : candidate.label === "best_location"
        ? "Best location"
        : "Alternative";
  const rates = candidate.hotel.url;
  const listing =
    candidate.hotel.listingUrl &&
    candidate.hotel.listingUrl !== rates
      ? candidate.hotel.listingUrl
      : undefined;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-3xl border border-border bg-card p-5 text-left shadow-sm transition hover:ring-1 hover:ring-white/15"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-lg font-semibold">
            {candidate.flight.airline} + {candidate.hotel.brand}
          </p>
          {candidate.hotel.room ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {candidate.hotel.room.name}
            </p>
          ) : null}
        </div>
        <StatusPill tone="info">{candidate.scores.matchPercent}% match</StatusPill>
      </div>
      <p className="mt-3 text-2xl font-semibold">
        {formatUsd(candidate.totalCents)}
      </p>
      {candidate.label === "lowest_cost" ? (
        <p className="mt-1 text-sm text-emerald-300">
          $172 cheaper · Hotel is{" "}
          {formatMiles(candidate.hotel.distanceMiles)} from venue.
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          {formatMiles(candidate.hotel.distanceMiles)} from venue
          {candidate.hotel.amenities?.[0]
            ? ` · ${candidate.hotel.amenities[0]}`
            : ""}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        {(candidate.bookingCompare?.cheapestFlight?.url ??
          candidate.flight.url) ? (
          <ExternalLink
            href={
              candidate.bookingCompare?.cheapestFlight?.url ??
              candidate.flight.url!
            }
          >
            {candidate.bookingCompare?.cheapestFlight
              ? `${candidate.bookingCompare.cheapestFlight.siteName} flights`
              : "Flights"}
          </ExternalLink>
        ) : null}
        {(candidate.bookingCompare?.cheapestHotel?.url ?? rates) ? (
          <ExternalLink
            href={
              candidate.bookingCompare?.cheapestHotel?.url ?? rates!
            }
          >
            {candidate.bookingCompare?.cheapestHotel
              ? `${candidate.bookingCompare.cheapestHotel.siteName} rates`
              : "Rates"}
          </ExternalLink>
        ) : listing ? (
          <ExternalLink href={listing}>Property</ExternalLink>
        ) : null}
      </div>
    </button>
  );
}
