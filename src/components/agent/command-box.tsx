"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CHIPS = [
  "NYC next week",
  "Conference travel",
  "Customer visit",
  "Team offsite",
] as const;

const DEFAULT_QUERY =
  "I need to attend MongoDB.local in Las Vegas Sep 22–25. Keep me close to the venue and I prefer United.";

export function CommandBox({
  initialQuery = "",
  autoFocus = false,
  className,
  variant = "hero",
}: {
  initialQuery?: string;
  autoFocus?: boolean;
  className?: string;
  variant?: "hero" | "compact";
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  function submit(value?: string) {
    const q = (value ?? query).trim();
    if (!q) return;
    router.push(`/agent?q=${encodeURIComponent(q)}`);
  }

  const hero = variant === "hero";

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "soar-search-focus transition",
          hero
            ? "rounded-[1.75rem] bg-[var(--search-surface)] p-5 text-[var(--search-foreground)] shadow-[0_30px_80px_-20px_rgb(59_130_246_/_0.45)] sm:p-6"
            : "rounded-3xl border border-border bg-card p-4 sm:p-5",
        )}
      >
        <textarea
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            hero
              ? "Describe the trip — city, dates, airline prefs, budget…"
              : '"I need to be in Las Vegas for MongoDB.local from Sep 22–25."'
          }
          rows={hero ? 2 : 3}
          className={cn(
            "w-full resize-none bg-transparent text-base leading-relaxed outline-none sm:text-lg",
            hero
              ? "placeholder:text-zinc-400"
              : "placeholder:text-muted-foreground/70",
          )}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Voice"
              className={hero ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" : undefined}
            >
              <Mic className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5",
                hero ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" : undefined,
              )}
              onClick={() => {
                setQuery(DEFAULT_QUERY);
                submit(DEFAULT_QUERY);
              }}
            >
              <Sparkles className="size-3.5" />
              Demo prompt
            </Button>
          </div>
          <Button
            type="button"
            size={hero ? "lg" : "sm"}
            onClick={() => submit()}
            className={cn(
              hero &&
                "rounded-full bg-zinc-950 px-6 text-white hover:bg-zinc-800",
            )}
          >
            Search
            <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => {
              const q =
                chip === "Conference travel"
                  ? DEFAULT_QUERY
                  : chip === "NYC next week"
                    ? "I need to be in NYC next week for a customer visit."
                    : `Help me plan ${chip.toLowerCase()}.`;
              setQuery(q);
              submit(q);
            }}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm transition",
              hero
                ? "border border-white/15 bg-white/5 text-zinc-300 hover:border-sky-300/40 hover:bg-white/10 hover:text-white"
                : "border border-border bg-card px-3.5 py-1.5 text-muted-foreground hover:border-white/20 hover:text-foreground",
            )}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
