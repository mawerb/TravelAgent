"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  applySuggestionAction,
  dismissSuggestionAction,
  updateSuggestionAction,
} from "@/app/actions/policy";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { dollarsToCents, formatUsd } from "@/lib/money";
import type { PolicySuggestion } from "@/types";

export function SuggestionReviewCard({
  suggestion,
}: {
  suggestion: PolicySuggestion;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState(suggestion.topic);
  const [currentPolicy, setCurrentPolicy] = useState(suggestion.currentPolicy);
  const [recommendation, setRecommendation] = useState(
    suggestion.recommendation,
  );
  const cityEntries = Object.entries(
    suggestion.proposedChanges?.cityCapsCents ?? {},
  );
  const [cityKey, setCityKey] = useState(cityEntries[0]?.[0] ?? "");
  const [cityCapDollars, setCityCapDollars] = useState(
    cityEntries[0] ? String(cityEntries[0][1]! / 100) : "",
  );
  const [standardDollars, setStandardDollars] = useState(
    suggestion.proposedChanges?.standardMaxCents != null
      ? String(suggestion.proposedChanges.standardMaxCents / 100)
      : "",
  );
  const [radius, setRadius] = useState(
    suggestion.proposedChanges?.conferenceRadiusMiles != null
      ? String(suggestion.proposedChanges.conferenceRadiusMiles)
      : "",
  );
  const [managerDollars, setManagerDollars] = useState(
    suggestion.proposedChanges?.managerApprovalAboveCents != null
      ? String(suggestion.proposedChanges.managerApprovalAboveCents / 100)
      : "",
  );

  function buildProposedChanges(): PolicySuggestion["proposedChanges"] {
    const proposed: NonNullable<PolicySuggestion["proposedChanges"]> = {
      ...suggestion.proposedChanges,
    };
    if (standardDollars.trim()) {
      proposed.standardMaxCents = dollarsToCents(Number(standardDollars));
    }
    if (cityKey.trim() && cityCapDollars.trim()) {
      proposed.cityCapsCents = {
        ...(proposed.cityCapsCents ?? {}),
        [cityKey.trim().toLowerCase()]: dollarsToCents(Number(cityCapDollars)),
      };
    }
    if (radius.trim()) {
      proposed.conferenceRadiusMiles = Number(radius);
    }
    if (managerDollars.trim()) {
      proposed.managerApprovalAboveCents = dollarsToCents(
        Number(managerDollars),
      );
    }
    return proposed;
  }

  function save() {
    setError(null);
    startTransition(async () => {
      await updateSuggestionAction({
        id: suggestion._id,
        topic,
        currentPolicy,
        recommendation,
        proposedChanges: buildProposedChanges(),
      });
      router.refresh();
    });
  }

  function apply() {
    setError(null);
    startTransition(async () => {
      await updateSuggestionAction({
        id: suggestion._id,
        topic,
        currentPolicy,
        recommendation,
        proposedChanges: buildProposedChanges(),
      });
      const result = await applySuggestionAction(suggestion._id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function dismiss() {
    startTransition(async () => {
      await dismissSuggestionAction(suggestion._id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatusPill tone="exception">{suggestion.title}</StatusPill>
        <p className="text-xs text-muted-foreground">
          {suggestion.tripsAnalyzed} feedback signals ·{" "}
          {suggestion.sourceFeedbackIds?.length ?? 0} linked responses
        </p>
      </div>

      <label className="mt-4 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Topic
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-sky-400/40"
        />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Current policy (notes)
          <input
            value={currentPolicy}
            onChange={(e) => setCurrentPolicy(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
          />
        </label>
        <label className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Median / target hotel
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatUsd(suggestion.medianApprovedHotelCents)}/night
          </p>
        </label>
      </div>

      <label className="mt-3 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Recommendation (editable)
        <textarea
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
        />
      </label>

      <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Proposed policy patch
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label="Standard max $/night"
            value={standardDollars}
            onChange={setStandardDollars}
            placeholder="e.g. 250"
          />
          <Field
            label="City key"
            value={cityKey}
            onChange={setCityKey}
            placeholder="las vegas"
          />
          <Field
            label="City cap $/night"
            value={cityCapDollars}
            onChange={setCityCapDollars}
            placeholder="e.g. 295"
          />
          <Field
            label="Conference radius (mi)"
            value={radius}
            onChange={setRadius}
            placeholder="e.g. 2"
          />
          <Field
            label="Manager approval above $"
            value={managerDollars}
            onChange={setManagerDollars}
            placeholder="e.g. 2500"
          />
        </div>
      </div>

      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {suggestion.predictedImpact.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>

      {error ? (
        <p className="mt-3 text-sm text-red-300">{error}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={pending} onClick={save} variant="outline">
          Save edits
        </Button>
        <Button disabled={pending} onClick={apply}>
          Apply to policy
        </Button>
        <Button disabled={pending} variant="ghost" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Policy never changes until you apply. Apply writes a new active policy
        version for this org.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-zinc-950 px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-sky-400/40"
      />
    </label>
  );
}
