"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveRequestAction,
  denyRequestAction,
} from "@/app/actions/approvals";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatUsd } from "@/lib/money";
import type { ApprovalRequest } from "@/types";

export function ApprovalQueue({ requests }: { requests: ApprovalRequest[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function approve(id: string) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      const result = await approveRequestAction(id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      router.push(`/trips/${result.booking._id}`);
    });
  }

  function deny(id: string) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      const result = await denyRequestAction(id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center">
        <p className="font-medium text-zinc-200">No approval requests</p>
        <p className="mt-1 text-sm text-zinc-500">
          Out-of-policy or over-threshold bookings land here for the manager.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {requests.map((r) => (
        <article
          key={r._id}
          className="rounded-3xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                {r.employeeName} → {r.managerName}
              </p>
              <h2 className="font-heading mt-1 text-xl font-semibold">
                {r.summary.route}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {r.summary.airline} · {r.summary.hotelName} ·{" "}
                {r.summary.startDate} → {r.summary.endDate}
              </p>
            </div>
            <StatusPill
              tone={
                r.status === "pending"
                  ? r.policyStatus === "out_of_policy"
                    ? "out_of_policy"
                    : "exception"
                  : r.status === "approved"
                    ? "compliant"
                    : "neutral"
              }
            >
              {r.status === "pending"
                ? r.policyStatus === "out_of_policy"
                  ? "Needs exception"
                  : "Needs approval"
                : r.status}
            </StatusPill>
          </div>

          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-amber-100/90">
            {r.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {formatUsd(r.summary.totalCents)} ·{" "}
              {formatUsd(r.summary.nightlyRateCents)}/night
            </p>
            {r.status === "pending" ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending && busyId === r._id}
                  onClick={() => deny(r._id)}
                >
                  Deny
                </Button>
                <Button
                  size="sm"
                  disabled={pending && busyId === r._id}
                  onClick={() => approve(r._id)}
                >
                  {busyId === r._id ? "Booking…" : "Approve & book"}
                </Button>
              </div>
            ) : r.bookingId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/trips/${r.bookingId}`)}
              >
                View trip
              </Button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
