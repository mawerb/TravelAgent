"use server";

import { BookingOrchestrator } from "@/lib/booking";
import type { Booking, BookingState } from "@/types";

export async function bookTripAction(input: {
  candidateId: string;
  bookingAttemptId?: string;
}): Promise<
  | {
      ok: true;
      booking: Booking;
      events: { state: BookingState; message: string }[];
    }
  | { ok: false; error: string; events?: { state: BookingState; message: string }[] }
> {
  try {
    // Never accept amount from client — orchestrator reloads candidate
    const result = await BookingOrchestrator({
      candidateId: input.candidateId,
      bookingAttemptId: input.bookingAttemptId,
    });
    return { ok: true, booking: result.booking, events: result.events };
  } catch (err) {
    const events =
      err && typeof err === "object" && "events" in err
        ? (err as { events: { state: BookingState; message: string }[] }).events
        : undefined;
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Booking failed",
      events,
    };
  }
}
