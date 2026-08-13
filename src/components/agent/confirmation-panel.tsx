"use client";

import { useEffect, useState } from "react";
import type { ParsedTripRequest, TripConfirmation } from "@/types";
import { reviseTripAction } from "@/app/actions/clarify";
import { buildTripConfirmation } from "@/lib/clarify";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmationPanel({
  confirmation,
  onConfirm,
  onDraftChange,
}: {
  confirmation: TripConfirmation;
  onConfirm: (parsed: ParsedTripRequest) => void;
  onDraftChange?: (parsed: ParsedTripRequest) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ParsedTripRequest>(confirmation.parsed);
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);

  useEffect(() => {
    setDraft(confirmation.parsed);
    setEditing(false);
    setPrompt("");
    setReply(null);
  }, [confirmation]);

  const live = buildTripConfirmation(draft);

  function updateDraft(next: ParsedTripRequest) {
    setDraft(next);
    onDraftChange?.(next);
  }

  function patch(partial: Partial<ParsedTripRequest>) {
    updateDraft({ ...draft, ...partial });
  }

  async function sendRevision() {
    const message = prompt.trim();
    if (!message || revising) return;
    setRevising(true);
    const res = await reviseTripAction(draft, message);
    setRevising(false);
    if (!res.ok) {
      setReply(res.error);
      return;
    }
    updateDraft(res.data.parsed);
    setReply(res.data.reply);
    setPrompt("");
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-white/5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Agent follow-up
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          {live.followUps.length > 0
            ? "I need a couple more details"
            : editing
              ? "Revise trip details"
              : "Double-check before I search"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {live.summary}
        </p>
      </div>

      {live.followUps.length > 0 ? (
        <ul className="space-y-3">
          {live.followUps.map((q) => (
            <li
              key={q.id}
              className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3"
            >
              <p className="text-sm font-medium text-amber-100">{q.prompt}</p>
              <p className="mt-1 text-sm text-amber-900/80">{q.answer}</p>
            </li>
          ))}
        </ul>
      ) : null}

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
              placeholder="e.g. SFO"
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
              placeholder="e.g. LAS"
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
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm">
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
              className="rounded-2xl border border-border/80 bg-muted px-4 py-3"
            >
              <p className="text-sm font-medium text-foreground">{q.prompt}</p>
              <p className="mt-1 text-sm text-muted-foreground">{q.answer}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-2xl border border-border/80 bg-muted p-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {live.followUps.length > 0
            ? "Reply to the agent"
            : "Tell the agent what to change"}
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendRevision();
            }
          }}
          rows={2}
          placeholder={
            live.followUps[0]
              ? live.followUps[0].answer
              : 'e.g. "flight under $300", "from SFO", "prefer Delta"'
          }
          className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/15"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={revising || !prompt.trim()}
            onClick={() => void sendRevision()}
          >
            {revising ? "Updating…" : "Send"}
          </Button>
          {reply ? (
            <p className="text-sm text-emerald-200">{reply}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          disabled={!live.canSearch}
          onClick={() => onConfirm(draft)}
        >
          {live.canSearch
            ? editing
              ? "Search with these details"
              : "Yes — find trips"
            : "Answer follow-ups to continue"}
        </Button>
        {editing ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditing(false);
            }}
          >
            Done editing fields
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            Edit fields
          </Button>
        )}
      </div>
    </section>
  );
}

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-white/15";

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
