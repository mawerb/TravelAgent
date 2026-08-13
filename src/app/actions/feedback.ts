"use server";

import { FeedbackAgent } from "@/lib/agents";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { EMP_ALEX_ID, ORG_ACME_ID } from "@/lib/session";
import type { Feedback } from "@/types";
import { revalidatePath } from "next/cache";

export async function submitFeedbackAction(input: {
  bookingId: string;
  flightStars: number;
  hotelStars: number;
  policyMadeHarder: boolean;
  frictionNote?: string;
  hotelBrand: string;
}) {
  const db = await getDb();
  const doc: Feedback = {
    _id: `fb_${Date.now()}`,
    organizationId: ORG_ACME_ID,
    employeeId: EMP_ALEX_ID,
    bookingId: input.bookingId,
    flightStars: input.flightStars,
    hotelStars: input.hotelStars,
    policyMadeHarder: input.policyMadeHarder,
    frictionNote: input.frictionNote,
    createdAt: new Date().toISOString(),
  };
  await col<Feedback>(db, "feedback").insertOne(doc);
  await FeedbackAgent({
    employeeId: EMP_ALEX_ID,
    hotelBrand: input.hotelBrand,
    hotelStars: input.hotelStars,
    policyMadeHarder: input.policyMadeHarder,
  });
  revalidatePath("/trips");
  revalidatePath("/profile");
  revalidatePath("/insights");
  return { ok: true as const };
}
