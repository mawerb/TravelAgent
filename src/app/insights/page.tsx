export const dynamic = "force-dynamic";

import { AnalyticsCharts } from "@/components/insights/analytics-charts";
import { BudgetCard } from "@/components/insights/budget-card";
import { SuggestionActions } from "@/components/insights/suggestion-actions";
import { StatusPill } from "@/components/ui/status-pill";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { LEDGER_ACME_ID, ORG_ACME_ID } from "@/lib/session";
import { formatUsd } from "@/lib/money";
import type { CompanyBudgetLedger, PolicySuggestion } from "@/types";

export default async function InsightsPage() {
  await ensureDemoSeeded();
  const db = await getDb();
  const ledger = await col<CompanyBudgetLedger>(
    db,
    "companyBudgetLedger",
  ).findOne({ _id: LEDGER_ACME_ID });
  const suggestions = await col<PolicySuggestion>(db, "policySuggestions")
    .find({ organizationId: ORG_ACME_ID, status: "open" })
    .toArray();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
        <p className="text-muted-foreground">
          Policy intelligence, spend, and traveler feedback — changes always
          require human review.
        </p>
      </header>

      {ledger ? <BudgetCard ledger={ledger} /> : null}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Policy Intelligence
        </h2>
        {suggestions.map((s) => (
          <div
            key={s._id}
            className="rounded-3xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <StatusPill tone="exception">{s.title}</StatusPill>
                <h3 className="mt-3 text-xl font-semibold">{s.topic}</h3>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Current policy</dt>
                <dd className="font-medium">{s.currentPolicy}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Median approved hotel</dt>
                <dd className="font-medium">
                  {formatUsd(s.medianApprovedHotelCents)}/night
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Employee behavior</dt>
                <dd className="font-medium">
                  {s.tripsAnalyzed} trips analyzed · {s.exceptionRequests}{" "}
                  exception requests · {s.employeesMentioned} employees mentioned
                  hotel location or price
                </dd>
              </div>
            </dl>
            <div className="mt-4 rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                AI recommendation
              </p>
              <p className="mt-1 font-medium">{s.recommendation}</p>
              <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Predicted impact
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {s.predictedImpact.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <SuggestionActions id={s._id} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Policy is never modified automatically.
            </p>
          </div>
        ))}
        {!suggestions.length ? (
          <p className="text-sm text-muted-foreground">
            No open policy suggestions.
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Admin analytics
        </h2>
        <AnalyticsCharts />
      </section>
    </div>
  );
}
