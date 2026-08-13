"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import type { AgentActivityStep } from "@/types";
import { cn } from "@/lib/utils";

export function ActivityStream({ steps }: { steps: AgentActivityStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <motion.li
          key={step.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.25 }}
          className={cn(
            "flex gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm",
            step.status === "pending" && "opacity-50",
          )}
        >
          <div className="mt-0.5">
            {step.status === "done" ? (
              <span className="flex size-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <Check className="size-3.5" />
              </span>
            ) : step.status === "active" ? (
              <span className="flex size-6 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">
                <Loader2 className="size-3.5 animate-spin" />
              </span>
            ) : (
              <span className="flex size-6 items-center justify-center rounded-full bg-stone-100 text-stone-400 ring-1 ring-stone-200">
                <span className="size-1.5 rounded-full bg-stone-400" />
              </span>
            )}
          </div>
          <div>
            <p className="font-medium">{step.title}</p>
            {step.detail ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{step.detail}</p>
            ) : null}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
