import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { seedDemoData } from "@/lib/db/seed";
import { ORG_ACME_ID } from "@/lib/session";
import type { Organization } from "@/types";

declare global {
  // eslint-disable-next-line no-var
  var _demoSeedPromise: Promise<void> | undefined;
}

/** Idempotent seed for DEMO_MODE cold starts (esp. memory Mongo). */
export async function ensureDemoSeeded(): Promise<void> {
  if (!global._demoSeedPromise) {
    global._demoSeedPromise = (async () => {
      const db = await getDb();
      const org = await col<Organization>(db, "organizations").findOne({
        _id: ORG_ACME_ID,
      });
      if (!org) {
        await seedDemoData();
      }
    })();
  }
  await global._demoSeedPromise;
}
