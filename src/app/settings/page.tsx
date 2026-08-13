export const dynamic = "force-dynamic";

import { seedAction } from "@/app/actions/seed";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { revalidatePath } from "next/cache";

export default function SettingsPage() {
  async function resetDemo() {
    "use server";
    await seedAction();
    revalidatePath("/", "layout");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Demo controls and environment.</p>
      </header>

      <div className="rounded-3xl border border-border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <StatusPill tone="info">DEMO_MODE</StatusPill>
          <span className="text-sm">
            {process.env.DEMO_MODE === "true" ? "true" : "false"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Travel search uses seeded/mock providers. Stripe uses TEST MODE or a
          mock adapter with the same state machine. Corporate budget lives in
          MongoDB — never Stripe balance.
        </p>
        <form action={resetDemo}>
          <Button type="submit" variant="outline">
            Reset demo data
          </Button>
        </form>
      </div>
    </div>
  );
}
