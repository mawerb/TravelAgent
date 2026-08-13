"use client";

import type { ClarifyingQuestion, TripConfirmation } from "@/types";
import { Button } from "@/components/ui/button";

export function ConfirmationPanel({
  confirmation,
  onConfirm,
  onRevise,
}: {
  confirmation: TripConfirmation;
  onConfirm: () => void;
  onRevise: () => void;
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-border bg-white p-6 shadow-sm ring-1 ring-black/[0.03]">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Agent follow-up
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          Double-check before I search
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {confirmation.summary}
        </p>
      </div>

      <ul className="space-y-3">
        {confirmation.questions.map((q) => (
          <QuestionRow key={q.id} question={q} />
        ))}
      </ul>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" onClick={onConfirm}>
          Yes — find trips
        </Button>
        <Button type="button" variant="outline" onClick={onRevise}>
          Let me revise
        </Button>
      </div>
    </section>
  );
}

function QuestionRow({ question }: { question: ClarifyingQuestion }) {
  return (
    <li className="rounded-2xl border border-border/80 bg-stone-50/80 px-4 py-3">
      <p className="text-sm font-medium text-foreground">{question.prompt}</p>
      <p className="mt-1 text-sm text-muted-foreground">{question.answer}</p>
    </li>
  );
}
