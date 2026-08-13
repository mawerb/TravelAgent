"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { TripCandidate } from "@/types";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money";
import { formatMiles } from "@/lib/geo";
import { cn } from "@/lib/utils";

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

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm ring-1 ring-black/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Recommended for you
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {candidate.flight.origin} → {candidate.flight.destination}
          </h2>
        </div>
        <StatusPill tone="compliant" className="text-sm px-3 py-1">
          {candidate.scores.matchPercent}% match
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
            {candidate.flight.departTime} – {candidate.flight.arriveTime}
          </p>
          <p className="text-sm text-muted-foreground">
            {candidate.flight.stops === 0 ? "Nonstop" : `${candidate.flight.stops} stop`} ·{" "}
            {candidate.flight.cabin[0]!.toUpperCase()}
            {candidate.flight.cabin.slice(1).replace("_", " ")}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Hotel
          </p>
          <p className="mt-2 text-lg font-medium">{candidate.hotel.name}</p>
          <p className="text-sm">
            {formatUsd(candidate.hotel.nightlyRateCents)}/night
          </p>
          <p className="text-sm text-muted-foreground">
            {formatMiles(candidate.hotel.distanceMiles)} from MongoDB.local ·{" "}
            {candidate.hotel.stars} stars
          </p>
        </div>
      </div>

      <div className="grid gap-4 border-t border-border bg-stone-50/80 px-6 py-5 sm:grid-cols-3">
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
          <p className="text-xl font-semibold text-emerald-700">
            {formatUsd(candidate.savingsCents)} below policy allowance
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-6 py-4">
        {candidate.explanationChips.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200"
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
          <p className="rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
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
          <pre className="overflow-auto rounded-xl bg-stone-900 p-3 text-xs text-stone-100">
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

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-3xl border border-border bg-white p-5 text-left shadow-sm transition hover:ring-1 hover:ring-stone-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-lg font-semibold">
            {candidate.flight.airline} + {candidate.hotel.brand}
          </p>
        </div>
        <StatusPill tone="info">{candidate.scores.matchPercent}% match</StatusPill>
      </div>
      <p className="mt-3 text-2xl font-semibold">
        {formatUsd(candidate.totalCents)}
      </p>
      {candidate.label === "lowest_cost" ? (
        <p className="mt-1 text-sm text-emerald-700">
          $172 cheaper · Hotel is{" "}
          {formatMiles(candidate.hotel.distanceMiles)} from venue.
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          {formatMiles(candidate.hotel.distanceMiles)} from venue.
        </p>
      )}
    </button>
  );
}
