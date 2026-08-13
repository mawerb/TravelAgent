"use server";

import { seedDemoData } from "@/lib/db/seed";

export async function seedAction() {
  try {
    await seedDemoData();
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Seed failed",
    };
  }
}
