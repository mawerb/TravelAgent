"use client";

import { useState } from "react";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function FeedbackForm({
  bookingId,
  hotelBrand,
}: {
  bookingId: string;
  hotelBrand: string;
}) {
  const [flightStars, setFlightStars] = useState(5);
  const [hotelStars, setHotelStars] = useState(5);
  const [policyHarder, setPolicyHarder] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  if (done) {
    return (
      <p className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 ring-1 ring-emerald-400/25">
        Thanks — your feedback updates your travel profile
        {policyHarder
          ? " and may create a policy suggestion for your manager."
          : "."}
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
      <h3 className="text-lg font-semibold">How was your trip?</h3>
      <StarRow label="Flight" value={flightStars} onChange={setFlightStars} />
      <StarRow label="Hotel" value={hotelStars} onChange={setHotelStars} />
      <div>
        <p className="text-sm font-medium">
          Did company travel policy make this trip harder?
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={policyHarder === true ? "default" : "outline"}
            onClick={() => setPolicyHarder(true)}
          >
            Yes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={policyHarder === false ? "default" : "outline"}
            onClick={() => setPolicyHarder(false)}
          >
            No
          </Button>
        </div>
      </div>
      {policyHarder ? (
        <div>
          <p className="mb-2 text-sm font-medium">Tell us what got in the way.</p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="The hotel limit was too low to stay near the conference."
          />
        </div>
      ) : null}
      <Button
        disabled={policyHarder === null || saving}
        onClick={async () => {
          setSaving(true);
          await submitFeedbackAction({
            bookingId,
            flightStars,
            hotelStars,
            policyMadeHarder: Boolean(policyHarder),
            frictionNote: note || undefined,
            hotelBrand,
          });
          setSaving(false);
          setDone(true);
        }}
      >
        Submit feedback
      </Button>
    </div>
  );
}

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`size-8 rounded-lg text-sm font-medium ring-1 ${
              n <= value
                ? "bg-amber-500/10 text-amber-200 ring-amber-400/25"
                : "bg-muted text-zinc-500 ring-white/10"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
