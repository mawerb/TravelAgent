export const dynamic = "force-dynamic";

import { ApprovalQueue } from "@/components/approvals/approval-queue";
import { SuggestionReviewCard } from "@/components/insights/suggestion-review-card";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { getDemoOrgDef } from "@/lib/demo-orgs";
import { getDemoSession } from "@/lib/session";
import type { ApprovalRequest, PolicySuggestion } from "@/types";

export default async function ApprovalsPage() {
  await ensureDemoSeeded();
  const { organization } = await getDemoSession();
  const orgDef = getDemoOrgDef(organization._id);
  const db = await getDb();
  const requests = await col<ApprovalRequest>(db, "approvalRequests")
    .find({ organizationId: organization._id })
    .sort({ createdAt: -1 })
    .limit(40)
    .toArray();
  const suggestions = await col<PolicySuggestion>(db, "policySuggestions")
    .find({ organizationId: organization._id, status: "open" })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm font-medium tracking-wide text-sky-300/80 uppercase">
          Manager view · demo
        </p>
        <h1 className="font-heading mt-1 text-3xl font-semibold tracking-tight">
          Approvals
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Acting as {orgDef.manager.name}, {orgDef.manager.title} at{" "}
          {organization.name}. Trip exceptions and policy suggestions from
          post-trip feedback land here.
          {pending ? ` ${pending} trip requests pending.` : ""}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Trip booking requests
        </h2>
        <ApprovalQueue requests={requests} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Policy suggestions from feedback
        </h2>
        {suggestions.length ? (
          suggestions.map((s) => (
            <SuggestionReviewCard key={s._id} suggestion={s} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No open policy suggestions yet. After a trip, use{" "}
            <span className="text-zinc-300">Send feedback SMS</span>, then
            submit feedback that says policy made the trip harder.
          </p>
        )}
      </section>
    </div>
  );
}
