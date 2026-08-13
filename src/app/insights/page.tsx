export const dynamic = "force-dynamic";

import { AnalyticsCharts } from "@/components/insights/analytics-charts";
import { BudgetCard } from "@/components/insights/budget-card";
import { SuggestionReviewCard } from "@/components/insights/suggestion-review-card";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { getDemoSession } from "@/lib/session";
import type { CompanyBudgetLedger, PolicySuggestion } from "@/types";

export default async function InsightsPage() {
  await ensureDemoSeeded();
  const { organization, ledgerId } = await getDemoSession();
  const db = await getDb();
  const ledger = await col<CompanyBudgetLedger>(
    db,
    "companyBudgetLedger",
  ).findOne({ _id: ledgerId });
  const suggestions = await col<PolicySuggestion>(db, "policySuggestions")
    .find({ organizationId: organization._id, status: "open" })
    .toArray();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Insights
        </h1>
        <p className="text-muted-foreground">
          Policy intelligence from traveler feedback — managers edit and apply
          changes; nothing updates automatically.
        </p>
      </header>

      {ledger ? <BudgetCard ledger={ledger} /> : null}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Policy suggestions
        </h2>
        {suggestions.map((s) => (
          <SuggestionReviewCard key={s._id} suggestion={s} />
        ))}
        {!suggestions.length ? (
          <p className="text-sm text-muted-foreground">
            No open policy suggestions. Send a post-trip feedback SMS, then
            submit feedback that mentions policy friction.
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
