"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AgentActivityStep, SearchResult, TripCandidate } from "@/types";
import { searchTravelAction } from "@/app/actions/search";
import { CommandBox } from "@/components/agent/command-box";
import { ActivityStream } from "@/components/agent/activity-stream";
import {
  AlternativeCard,
  RecommendationCard,
} from "@/components/agent/recommendation-card";
import { BookingModal } from "@/components/booking/booking-modal";
import { Button } from "@/components/ui/button";

export function AgentExperience() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<AgentActivityStep[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAlts, setShowAlts] = useState(false);
  const [selected, setSelected] = useState<TripCandidate | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const lastQuery = useRef<string>("");

  useEffect(() => {
    if (!q || q === lastQuery.current) return;
    lastQuery.current = q;
    void runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function runSearch(query: string) {
    setRunning(true);
    setError(null);
    setResult(null);
    setShowAlts(false);
    setSteps([
      { id: "parse", title: "Understanding trip", detail: "", status: "active" },
      {
        id: "policy",
        title: "Checking company travel policy",
        detail: "",
        status: "pending",
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

    // Animate pending steps while server works
    const animate = async () => {
      for (let i = 0; i < 6; i++) {
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

    const res = await searchTravelAction(query);
    await animPromise;

    if (!res.ok) {
      setError(res.error);
      setRunning(false);
      return;
    }

    setSteps(res.data.steps.map((s) => ({ ...s, status: "done" })));
    setResult(res.data);
    setSelected(res.data.recommended);
    setRunning(false);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Ask Travel Agent
        </h1>
        <p className="text-muted-foreground">
          Tell us where you need to go. We handle policy, preferences,
          proximity, price, and booking.
        </p>
      </header>

      <CommandBox initialQuery={q} autoFocus={!q} />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => runSearch(q)}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      {(running || steps.length > 0) && !result ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Agent activity
          </h2>
          <ActivityStream steps={steps} />
        </section>
      ) : null}

      {result ? (
        <section className="space-y-6">
          <ActivityStream steps={result.steps} />
          <RecommendationCard
            candidate={selected && selected.label === "recommended" ? selected : result.recommended}
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
