"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AgentActivityStep,
  ParsedTripRequest,
  SearchResult,
  TripCandidate,
  TripConfirmation,
} from "@/types";
import { clarifyTripAction } from "@/app/actions/clarify";
import { searchTravelAction } from "@/app/actions/search";
import { CommandBox } from "@/components/agent/command-box";
import { ConfirmationPanel } from "@/components/agent/confirmation-panel";
import { ActivityStream } from "@/components/agent/activity-stream";
import {
  AlternativeCard,
  RecommendationCard,
} from "@/components/agent/recommendation-card";
import { BookingModal } from "@/components/booking/booking-modal";
import { Button } from "@/components/ui/button";
import { composePromptFromParsed, formatRouteLabel } from "@/lib/clarify";

export function AgentExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<AgentActivityStep[]>([]);
  const [confirmation, setConfirmation] = useState<TripConfirmation | null>(
    null,
  );
  const [draftParsed, setDraftParsed] = useState<ParsedTripRequest | null>(
    null,
  );
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAlts, setShowAlts] = useState(false);
  const [selected, setSelected] = useState<TripCandidate | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const lastQuery = useRef<string>("");

  useEffect(() => {
    if (!q || q === lastQuery.current) return;
    lastQuery.current = q;
    void runClarify(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function runClarify(query: string) {
    setRunning(true);
    setError(null);
    setResult(null);
    setConfirmation(null);
    setDraftParsed(null);
    setShowAlts(false);
    setSteps([
      {
        id: "parse",
        title: "Understanding trip",
        detail: "Parsing your request…",
        status: "active",
      },
    ]);

    const res = await clarifyTripAction(query);
    if (!res.ok) {
      setError(res.error);
      setRunning(false);
      setSteps([]);
      return;
    }

    setSteps([
      {
        id: "parse",
        title: "Understanding trip",
        detail: formatRouteLabel(res.data.parsed),
        status: "done",
      },
      {
        id: "confirm",
        title: res.data.canSearch
          ? "Confirming details with you"
          : "Asking follow-up questions",
        detail: res.data.canSearch
          ? "Waiting for your go-ahead"
          : "Need a few more details",
        status: "active",
      },
    ]);
    setConfirmation(res.data);
    setDraftParsed(res.data.parsed);
    setRunning(false);
  }

  async function runSearch(query: string, parsed: ParsedTripRequest) {
    setRunning(true);
    setError(null);
    setResult(null);
    setShowAlts(false);
    setDraftParsed(parsed);
    setSteps([
      {
        id: "parse",
        title: "Understanding trip",
        detail: formatRouteLabel(parsed),
        status: "done",
      },
      {
        id: "confirm",
        title: "Details confirmed",
        detail: "Proceeding to search",
        status: "done",
      },
      {
        id: "policy",
        title: "Checking company travel policy",
        detail: "",
        status: "active",
      },
      { id: "flights", title: "Searching flights", detail: "", status: "pending" },
      {
        id: "hotels",
        title: "Searching hotels near the venue",
        detail: "",
        status: "pending",
      },
      {
        id: "prefs",
        title: "Matching your preferences",
        detail: "",
        status: "pending",
      },
      {
        id: "optimize",
        title: "Optimizing trip",
        detail: "Balancing policy, proximity, preference, and price",
        status: "pending",
      },
    ]);

    const animate = async () => {
      for (let i = 2; i < 7; i++) {
        await new Promise((r) => setTimeout(r, 280));
        setSteps((prev) =>
          prev.map((s, idx) => ({
            ...s,
            status:
              idx < i ? "done" : idx === i ? "active" : ("pending" as const),
          })),
        );
      }
    };
    const animPromise = animate();

    const res = await searchTravelAction(query, parsed);
    await animPromise;

    if (!res.ok) {
      setError(res.error);
      setRunning(false);
      // Keep confirmation + draft so the user does not start from scratch.
      return;
    }

    setConfirmation(null);
    setSteps(res.data.steps.map((s) => ({ ...s, status: "done" as const })));
    setResult(res.data);
    setSelected(res.data.recommended);
    setRunning(false);
  }

  function continueWithContext() {
    const parsed = draftParsed ?? confirmation?.parsed;
    if (!parsed) {
      void runClarify(q);
      return;
    }
    const next = composePromptFromParsed(parsed);
    lastQuery.current = "";
    router.push(`/agent?q=${encodeURIComponent(next)}`);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Ask Travel Agent
        </h1>
        <p className="text-muted-foreground">
          Tell us where you need to go. We handle policy, preferences,
          proximity, price, and booking — and we&apos;ll confirm details with
          you first.
        </p>
      </header>

      <CommandBox initialQuery={q} autoFocus={!q} />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(draftParsed || confirmation) && (
              <Button size="sm" onClick={continueWithContext}>
                Continue with your details
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (draftParsed) void runSearch(q, draftParsed);
                else void runClarify(q);
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      {(running || steps.length > 0) && !result && !confirmation ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Agent activity
          </h2>
          <ActivityStream steps={steps} />
        </section>
      ) : null}

      {confirmation && !result ? (
        <section className="space-y-4">
          <ActivityStream steps={steps} />
          <ConfirmationPanel
            confirmation={confirmation}
            onDraftChange={setDraftParsed}
            onConfirm={(parsed) => void runSearch(q, parsed)}
          />
        </section>
      ) : null}

      {result ? (
        <section className="space-y-6">
          <ActivityStream steps={result.steps} />
          {result.preferenceNote ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {result.preferenceNote}
            </div>
          ) : null}
          <RecommendationCard
            candidate={
              selected && selected.label === "recommended"
                ? selected
                : result.recommended
            }
            onBook={() => {
              setSelected(result.recommended);
              setBookOpen(true);
            }}
            onSeeAlternatives={() => setShowAlts(true)}
          />
          {showAlts ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Alternatives
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.alternatives.map((alt) => (
                  <AlternativeCard
                    key={alt._id}
                    candidate={alt}
                    onSelect={() => {
                      setSelected(alt);
                      setBookOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <BookingModal
        open={bookOpen}
        onOpenChange={setBookOpen}
        candidate={selected}
      />
    </div>
  );
}
