"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import type { ApprovalRequest, Booking, TripCandidate } from "@/types";
import { bookTripAction } from "@/app/actions/book";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/status-pill";
import { formatUsd } from "@/lib/money";

type Phase = "confirm" | "progress" | "success" | "approval" | "error";

const PROGRESS_LABELS = [
  "Policy verified",
  "Corporate payment authorized",
  "Flight reserved",
  "Hotel reserved",
  "Payment captured",
] as const;

export function BookingModal({
  open,
  onOpenChange,
  candidate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: TripCandidate | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("confirm");
  const [progressIdx, setProgressIdx] = useState(-1);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [attemptId] = useState(() => `ba_${Date.now()}`);

  const needsManagerHint =
    candidate &&
    (candidate.policy.status === "out_of_policy" ||
      candidate.policy.requiresManagerApproval);

  useEffect(() => {
    if (!open) {
      setPhase("confirm");
      setProgressIdx(-1);
      setBooking(null);
      setApproval(null);
      setError(null);
      setJustification("");
    }
  }, [open]);

  async function confirm() {
    if (!candidate) return;
    setPhase("progress");
    setProgressIdx(0);

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < PROGRESS_LABELS.length; i++) {
      timers.push(setTimeout(() => setProgressIdx(i), i * 450));
    }

    const result = await bookTripAction({
      candidateId: candidate._id,
      bookingAttemptId: attemptId,
      justification: justification.trim() || undefined,
    });

    timers.forEach(clearTimeout);
    setProgressIdx(PROGRESS_LABELS.length - 1);

    if (!result.ok) {
      setError(result.error);
      setPhase("error");
      return;
    }

    if ("needsApproval" in result && result.needsApproval) {
      setApproval(result.request);
      setPhase("approval");
      router.refresh();
      return;
    }

    await new Promise((r) => setTimeout(r, 400));
    if (!("booking" in result) || !result.booking) {
      setError("Booking failed");
      setPhase("error");
      return;
    }
    setBooking(result.booking);
    setPhase("success");
    router.refresh();
  }

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-border sm:max-w-md">
        <AnimatePresence mode="wait">
          {phase === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-5"
            >
              <DialogHeader>
                <DialogTitle className="text-xl">Confirm booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 rounded-2xl bg-muted p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Trip</span>
                  <span className="font-medium text-right">
                    {candidate.flight.origin} → {candidate.flight.destination}
                    <br />
                    <span className="font-normal text-muted-foreground">
                      {candidate.startDate} → {candidate.endDate} ·{" "}
                      {candidate.nights} night
                      {candidate.nights === 1 ? "" : "s"}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Flight</span>
                  <span className="text-right font-medium">
                    {candidate.flight.airline} ·{" "}
                    {formatUsd(candidate.flightCents)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Hotel</span>
                  <span className="text-right font-medium">
                    {candidate.hotel.name}
                    <br />
                    <span className="font-normal text-muted-foreground">
                      {candidate.hotel.room?.name ?? candidate.hotel.brand} ·{" "}
                      {formatUsd(candidate.hotelCents)}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-base">
                  <span className="font-medium">Total</span>
                  <span className="font-semibold">
                    {formatUsd(candidate.totalCents)}
                  </span>
                </div>
              </div>

              {needsManagerHint ? (
                <div className="space-y-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
                  <StatusPill
                    tone={
                      candidate.policy.status === "out_of_policy"
                        ? "out_of_policy"
                        : "exception"
                    }
                  >
                    {candidate.policy.status === "out_of_policy"
                      ? "Out of policy"
                      : "Manager approval"}
                  </StatusPill>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-amber-100">
                    {candidate.policy.reasons
                      .filter((r) => r !== "Within travel policy")
                      .map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                  </ul>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={2}
                    placeholder="Optional note for your manager…"
                    className="w-full resize-none rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  />
                </div>
              ) : null}

              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">Corporate card</p>
                    <p className="text-sm text-muted-foreground">
                      Charged after policy / manager clearance
                    </p>
                  </div>
                  <StatusPill tone="info">TEST MODE</StatusPill>
                </div>
              </div>
              <Button
                className="h-11 w-full rounded-xl text-base"
                onClick={confirm}
              >
                {needsManagerHint ? "Request manager approval" : "Confirm & Book"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                No personal payment required.
              </p>
            </motion.div>
          )}

          {phase === "progress" && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-5 py-2"
            >
              <DialogHeader>
                <DialogTitle className="text-xl">Booking your trip</DialogTitle>
              </DialogHeader>
              <ul className="space-y-3">
                {PROGRESS_LABELS.map((label, i) => {
                  const done = i <= progressIdx;
                  const active = i === progressIdx;
                  return (
                    <li key={label} className="flex items-center gap-3 text-sm">
                      {done ? (
                        <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                          {active && i < PROGRESS_LABELS.length - 1 ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                        </span>
                      ) : (
                        <span className="size-6 rounded-full bg-muted ring-1 ring-white/10" />
                      )}
                      <span className={done ? "font-medium" : "text-muted-foreground"}>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}

          {phase === "approval" && approval && (
            <motion.div
              key="approval"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5 py-1"
            >
              <DialogHeader>
                <DialogTitle className="text-2xl">Sent to manager</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {approval.managerName} ({approval.managerTitle}) has a pending
                request for {approval.summary.route}. Nothing is charged until
                they approve.
              </p>
              <ul className="list-disc space-y-1 rounded-2xl bg-muted px-5 py-3 text-sm">
                {approval.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/approvals");
                  }}
                >
                  Open manager queue
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => onOpenChange(false)}
                >
                  Done
                </Button>
              </div>
            </motion.div>
          )}

          {phase === "success" && booking && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5 py-1"
            >
              <div className="text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                  <Check className="size-6" />
                </div>
                <DialogHeader>
                  <DialogTitle className="text-2xl">You&apos;re booked.</DialogTitle>
                </DialogHeader>
                <p className="mt-2 text-muted-foreground">
                  {booking.originCity} → {booking.destinationCity}
                  <br />
                  {booking.startDate} → {booking.endDate}
                </p>
              </div>
              <div className="space-y-3 rounded-2xl bg-muted p-4 text-sm">
                <div>
                  <p className="font-medium">{booking.flight.airline} Airlines</p>
                  <p className="text-muted-foreground">
                    Confirmation: {booking.flight.confirmation ?? "UA7X92L"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">{booking.hotel.brand}</p>
                  <p className="text-muted-foreground">
                    Confirmation: {booking.hotel.confirmation ?? "HLT83291"}
                  </p>
                </div>
                <p className="border-t border-border pt-3 font-medium">
                  {formatUsd(booking.totalCents)} charged to corporate card
                </p>
              </div>
              <div className="flex justify-center">
                <StatusPill tone="info">TEST MODE</StatusPill>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    onOpenChange(false);
                    router.push(`/trips/${booking._id}`);
                  }}
                >
                  View trip
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => onOpenChange(false)}
                >
                  Done
                </Button>
              </div>
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div key="error" className="space-y-4">
              <DialogHeader>
                <DialogTitle>Booking failed</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-red-300">{error}</p>
              <Button variant="outline" onClick={() => setPhase("confirm")}>
                Try again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
