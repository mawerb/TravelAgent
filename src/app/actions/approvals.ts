"use server";

import { revalidatePath } from "next/cache";
import { BookingOrchestrator } from "@/lib/booking";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { getDemoSession } from "@/lib/session";
import type { ApprovalRequest, Booking } from "@/types";

export async function approveRequestAction(
  requestId: string,
): Promise<
  | { ok: true; booking: Booking }
  | { ok: false; error: string }
> {
  const session = await getDemoSession();
  const db = await getDb();
  const request = await col<ApprovalRequest>(db, "approvalRequests").findOne({
    _id: requestId,
    organizationId: session.organization._id,
  });
  if (!request) return { ok: false, error: "Request not found" };
  if (request.status === "denied") {
    return { ok: false, error: "Request was already denied" };
  }

  const now = new Date().toISOString();
  if (request.status !== "approved") {
    await col<ApprovalRequest>(db, "approvalRequests").updateOne(
      { _id: requestId },
      { $set: { status: "approved", resolvedAt: now } },
    );
  }

  try {
    const result = await BookingOrchestrator({
      candidateId: request.candidateId,
      bookingAttemptId: `ba_apr_${requestId}`,
      approvedRequestId: requestId,
    });
    if (result.kind !== "booked") {
      return { ok: false, error: "Booking still needs approval" };
    }
    revalidatePath("/approvals");
    revalidatePath("/trips");
    return { ok: true, booking: result.booking };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Booking failed",
    };
  }
}

export async function denyRequestAction(
  requestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getDemoSession();
  const db = await getDb();
  const result = await col<ApprovalRequest>(db, "approvalRequests").updateOne(
    {
      _id: requestId,
      organizationId: session.organization._id,
      status: "pending",
    },
    { $set: { status: "denied", resolvedAt: new Date().toISOString() } },
  );
  if (result.matchedCount === 0) {
    return { ok: false, error: "Pending request not found" };
  }
  revalidatePath("/approvals");
  return { ok: true };
}
