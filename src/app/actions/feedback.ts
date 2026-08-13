"use server";

import { FeedbackAgent } from "@/lib/agents";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { getDemoSession } from "@/lib/session";
import {
  appBaseUrl,
  feedbackRequestSms,
  resolveSmsTo,
  sendSms,
} from "@/lib/sms/twilio";
import type { Booking, Feedback } from "@/types";
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
  const { organization, employee } = await getDemoSession();
  const booking = await col<Booking>(db, "bookings").findOne({
    _id: input.bookingId,
  });
  if (!booking) return { ok: false as const, error: "Trip not found" };

  const doc: Feedback = {
    _id: `fb_${Date.now()}`,
    organizationId: organization._id,
    employeeId: employee._id,
    bookingId: input.bookingId,
    flightStars: input.flightStars,
    hotelStars: input.hotelStars,
    policyMadeHarder: input.policyMadeHarder,
    frictionNote: input.frictionNote,
    createdAt: new Date().toISOString(),
  };
  await col<Feedback>(db, "feedback").insertOne(doc);
  await FeedbackAgent({
    employeeId: employee._id,
    organizationId: organization._id,
    feedbackId: doc._id,
    hotelBrand: input.hotelBrand,
    hotelStars: input.hotelStars,
    flightStars: input.flightStars,
    policyMadeHarder: input.policyMadeHarder,
    frictionNote: input.frictionNote,
    destinationCity: booking.destinationCity,
    nightlyRateCents: booking.hotel.nightlyRateCents,
  });
  revalidatePath("/trips");
  revalidatePath("/profile");
  revalidatePath("/insights");
  revalidatePath("/approvals");
  revalidatePath("/policy");
  return { ok: true as const };
}

export async function requestFeedbackSmsAction(bookingId: string) {
  const db = await getDb();
  const { employee } = await getDemoSession();
  const booking = await col<Booking>(db, "bookings").findOne({
    _id: bookingId,
    employeeId: employee._id,
  });
  if (!booking) return { ok: false as const, error: "Trip not found" };

  const to = resolveSmsTo(employee.phone);
  if (!to) {
    return {
      ok: false as const,
      error: "No phone on file. Set DEMO_SMS_TO or employee.phone.",
    };
  }

  const result = await sendSms({
    to,
    purpose: "feedback",
    body: feedbackRequestSms({
      name: employee.name,
      route: `${booking.originCity} → ${booking.destinationCity}`,
      feedbackUrl: `${appBaseUrl()}/trips/${booking._id}#feedback`,
    }),
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error ?? "SMS failed" };
  }

  return {
    ok: true as const,
    demo: result.demo,
    to: result.to,
  };
}
