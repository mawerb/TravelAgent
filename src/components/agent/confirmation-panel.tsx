"use client";

import { useEffect, useState } from "react";
import type { ParsedTripRequest, TripConfirmation } from "@/types";
import { buildTripConfirmation } from "@/lib/clarify";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmationPanel({
  confirmation,
  onConfirm,
}: {
  confirmation: TripConfirmation;
  onConfirm: (parsed: ParsedTripRequest) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ParsedTripRequest>(confirmation.parsed);

  useEffect(() => {
    setDraft(confirmation.parsed);
    setEditing(false);
  }, [confirmation]);

  const live = buildTripConfirmation(draft);

  function patch(partial: Partial<ParsedTripRequest>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-white p-6 shadow-sm ring-1 ring-black/[0.03]">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Agent follow-up
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          {editing ? "Revise trip details" : "Double-check before I search"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {live.summary}
        </p>
      </div>

      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Check-in">
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="Check-out">
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => patch({ endDate: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="Origin airport">
            <input
              value={draft.originAirport}
              onChange={(e) =>
                patch({ originAirport: e.target.value.toUpperCase() })
              }
              className={fieldClass}
              maxLength={3}
            />
          </Field>
          <Field label="Destination airport">
            <input
              value={draft.destinationAirport}
              onChange={(e) =>
                patch({ destinationAirport: e.target.value.toUpperCase() })
              }
              className={fieldClass}
              maxLength={3}
            />
          </Field>
          <Field label="Destination city" className="sm:col-span-2">
            <input
              value={draft.destinationCity}
              onChange={(e) => patch({ destinationCity: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="Purpose / venue" className="sm:col-span-2">
            <input
              value={draft.venueName ?? draft.purpose}
              onChange={(e) =>
                patch({ purpose: e.target.value, venueName: e.target.value })
              }
              className={fieldClass}
            />
          </Field>
          <Field label="Preferred airline">
            <input
              value={draft.preferredAirline ?? ""}
              onChange={(e) =>
                patch({
                  preferredAirline: e.target.value || undefined,
                })
              }
              placeholder="e.g. United"
              className={fieldClass}
            />
          </Field>
          <Field label="Proximity">
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-3 text-sm">
              <input
                type="checkbox"
                checked={draft.proximityPreferred}
                onChange={(e) =>
                  patch({ proximityPreferred: e.target.checked })
                }
              />
              Stay close to the venue
            </label>
          </Field>
        </div>
      ) : (
        <ul className="space-y-3">
          {live.questions.map((q) => (
            <li
              key={q.id}
              className="rounded-2xl border border-border/80 bg-stone-50/80 px-4 py-3"
            >
              <p className="text-sm font-medium text-foreground">{q.prompt}</p>
              <p className="mt-1 text-sm text-muted-foreground">{q.answer}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" onClick={() => onConfirm(draft)}>
          {editing ? "Search with these details" : "Yes — find trips"}
        </Button>
        {editing ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft(confirmation.parsed);
              setEditing(false);
            }}
          >
            Cancel edits
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            Let me revise
          </Button>
        )}
      </div>
    </section>
  );
}

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-stone-300";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
