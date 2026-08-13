import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { seedDemoData } from "@/lib/db/seed";
import { upsertAllDemoOrgs } from "@/lib/db/demo-orgs-seed";
import { ensureIndexes } from "@/lib/db/indexes";
import { HOTEL_DETAILS } from "@/lib/hotel-details";
import { HOTEL_URLS, POLICY_PDF_PATH } from "@/lib/links";
import { ORG_ACME_ID, POLICY_ACME_ID } from "@/lib/session";
import { DEMO_ORGS } from "@/lib/demo-orgs";
import type { Hotel, Organization, TravelPolicy } from "@/types";

declare global {
  // eslint-disable-next-line no-var
  var _demoSeedPromise: Promise<void> | undefined;
}

const HOTEL_NAMES: Record<string, string> = {
  hotel_hilton_vegas_near: "Hilton Grand Vacations Club Elara",
  hotel_marriott_vegas_closest: "Renaissance Las Vegas Hotel",
  hotel_hampton_vegas: "Hampton Inn Las Vegas Strip South",
  hotel_westin_vegas: "The Westin Las Vegas Hotel & Spa",
  hotel_hyatt_vegas: "Hyatt Place Las Vegas",
};

/** Patch live Atlas docs that were seeded before listing/room fields existed. */
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
  const fetchedAt = new Date().toISOString();
  for (const [id, listingUrl] of Object.entries(HOTEL_URLS)) {
    const details = HOTEL_DETAILS[id];
    await col<Hotel>(db, "hotels").updateOne(
      { _id: id },
      {
        $set: {
          listingUrl,
          url: listingUrl,
          ...(HOTEL_NAMES[id] ? { name: HOTEL_NAMES[id] } : {}),
          ...(details
            ? {
                amenities: details.amenities,
                address: details.address,
                neighborhood: details.neighborhood,
                room: details.room,
              }
            : {}),
        },
        $setOnInsert: { fetchedAt },
      },
      { upsert: false },
    );
  }
  // Stamp missing fetchedAt so TTL treats seeded Vegas inventory as fresh
  await col<Hotel>(db, "hotels").updateMany(
    { fetchedAt: { $exists: false } },
    { $set: { fetchedAt } },
  );
}

/** Idempotent seed for DEMO_MODE cold starts (esp. memory Mongo). */
export async function ensureDemoSeeded(): Promise<void> {
  if (!global._demoSeedPromise) {
    global._demoSeedPromise = (async () => {
      const db = await getDb();
      const knownIds = [
        ORG_ACME_ID,
        "org_acme",
        ...DEMO_ORGS.map((o) => o.organization._id),
      ];
      const org = await col<Organization>(db, "organizations").findOne({
        _id: { $in: knownIds },
      });
      if (!org) {
        await seedDemoData();
      } else {
        await ensureListingUrls();
        await upsertAllDemoOrgs(db);
      }
    })();
  }
  await global._demoSeedPromise;
}
