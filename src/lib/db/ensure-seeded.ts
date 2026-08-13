import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { seedDemoData } from "@/lib/db/seed";
import { ensureIndexes } from "@/lib/db/indexes";
import { HOTEL_URLS, POLICY_PDF_PATH } from "@/lib/links";
import { ORG_ACME_ID, POLICY_ACME_ID } from "@/lib/session";
import type { Hotel, Organization, TravelPolicy } from "@/types";

declare global {
  // eslint-disable-next-line no-var
  var _demoSeedPromise: Promise<void> | undefined;
}

/** Patch live Atlas docs that were seeded before urls existed. */
async function ensureListingUrls(): Promise<void> {
  const db = await getDb();
  await ensureIndexes(db);
  await col<TravelPolicy>(db, "travelPolicies").updateOne(
    { _id: POLICY_ACME_ID },
    {
      $set: {
        source: "Acme_Travel_Policy_2026.pdf",
        sourceUrl: POLICY_PDF_PATH,
      },
    },
  );
  for (const [id, url] of Object.entries(HOTEL_URLS)) {
    await col<Hotel>(db, "hotels").updateOne(
      { _id: id },
      {
        $set: {
          url,
          ...(id === "hotel_hilton_vegas_near"
            ? { name: "Hilton Grand Vacations Club Elara" }
            : {}),
          ...(id === "hotel_marriott_vegas_closest"
            ? { name: "Renaissance Las Vegas Hotel" }
            : {}),
          ...(id === "hotel_hampton_vegas"
            ? { name: "Hampton Inn Las Vegas Strip South" }
            : {}),
          ...(id === "hotel_westin_vegas"
            ? { name: "The Westin Las Vegas Hotel & Spa" }
            : {}),
        },
      },
    );
  }
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
      } else {
        await ensureListingUrls();
      }
    })();
  }
  await global._demoSeedPromise;
}
