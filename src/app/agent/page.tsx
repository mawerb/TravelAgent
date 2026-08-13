export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { AgentExperience } from "@/components/agent/agent-experience";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";

export default async function AgentPage() {
  await ensureDemoSeeded();
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading agent…</div>}>
      <AgentExperience />
    </Suspense>
  );
}
