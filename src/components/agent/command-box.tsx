"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mic, Paperclip, Search } from "lucide-react";
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
}: {
  initialQuery?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function submit(value?: string) {
    const q = (value ?? query).trim();
    if (!q) return;
    router.push(`/agent?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-3xl border border-border bg-white p-4 shadow-sm ring-1 ring-black/[0.03] sm:p-5">
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
            '"I need to be in Las Vegas for MongoDB.local from Sep 22–25. Keep me close to the venue."'
          }
          rows={3}
          className="w-full resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground/70"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Voice">
              <Mic className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Attach"
            >
              <Paperclip className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery(DEFAULT_QUERY);
                submit(DEFAULT_QUERY);
              }}
            >
              Demo prompt
            </Button>
            <Button type="button" size="sm" onClick={() => submit()}>
              <Search className="size-3.5" />
              Search trips
            </Button>
          </div>
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
            className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm text-muted-foreground transition hover:border-stone-300 hover:text-foreground"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
