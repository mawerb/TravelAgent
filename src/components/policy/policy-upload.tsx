"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  "Reading document",
  "Extracting travel rules",
  "Creating policy embeddings",
  "Validating rules",
  "Publishing policy",
] as const;

export function PolicyUploadButton() {
  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [done, setDone] = useState(false);

  async function simulate() {
    setRunning(true);
    setDone(false);
    for (let i = 0; i < STEPS.length; i++) {
      setIdx(i);
      await new Promise((r) => setTimeout(r, 400));
    }
    setRunning(false);
    setDone(true);
  }

  return (
    <div className="space-y-3">
      <Button onClick={simulate} disabled={running}>
        Upload new policy
      </Button>
      {(running || done) && (
        <ul className="space-y-2 rounded-2xl border border-border bg-card p-4">
          {STEPS.map((step, i) => {
            const complete = i < idx || (done && i <= idx);
            const active = running && i === idx;
            return (
              <li key={step} className="flex items-center gap-2 text-sm">
                {complete ? (
                  <Check className="size-4 text-emerald-600" />
                ) : active ? (
                  <Loader2 className="size-4 animate-spin text-sky-600" />
                ) : (
                  <span className="size-4 rounded-full bg-muted" />
                )}
                {step}
              </li>
            );
          })}
        </ul>
      )}
      {done ? (
        <p className="text-sm text-emerald-300">
          Policy republished from uploaded PDF (demo simulation).
        </p>
      ) : null}
    </div>
  );
}
