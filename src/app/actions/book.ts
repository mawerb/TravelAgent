"use server";

import { BookingOrchestrator } from "@/lib/booking";
import type { ApprovalRequest, Booking, BookingState } from "@/types";

export async function bookTripAction(input: {
  candidateId: string;
  bookingAttemptId?: string;
  justification?: string;
}): Promise<
  | {
      ok: true;
      booking: Booking;
      events: { state: BookingState; message: string }[];
    }
  | {
      ok: true;
      needsApproval: true;
      request: ApprovalRequest;
      events: { state: BookingState; message: string }[];
    }
  | { ok: false; error: string; events?: { state: BookingState; message: string }[] }
> {
  try {
    const result = await BookingOrchestrator({
      candidateId: input.candidateId,
      bookingAttemptId: input.bookingAttemptId,
      justification: input.justification,
    });
    if (result.kind === "needs_approval") {
      return {
        ok: true,
        needsApproval: true,
        request: result.request,
        events: result.events,
      };
    }
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
