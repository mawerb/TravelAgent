"use client";

import { useState } from "react";
import { createPolicyFromSurveyAction } from "@/app/actions/policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const QUESTIONS = [
  { key: "hotelLimitDollars", label: "What is your default hotel nightly limit?", type: "number", default: "250" },
  { key: "cabin", label: "What flight cabin is permitted?", type: "text", default: "Economy under 6 hours" },
  { key: "businessWhen", label: "When is business class allowed?", type: "text", default: "Requires VP approval" },
  { key: "preferredAirlines", label: "Which airlines are preferred?", type: "text", default: "United, Delta" },
  { key: "distanceMiles", label: "What conference distance is acceptable (miles)?", type: "number", default: "1" },
  { key: "managerApprovalDollars", label: "When is manager approval required ($)?", type: "number", default: "2500" },
] as const;

export function PolicySurvey() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({
    hotelLimitDollars: "250",
    cabin: "Economy under 6 hours",
    businessWhen: "Requires VP approval",
    preferredAirlines: "United, Delta",
    distanceMiles: "1",
    managerApprovalDollars: "2500",
  });
  const [nearVenue, setNearVenue] = useState(true);
  const [refundable, setRefundable] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-xl font-semibold">Policy generated</h2>
        <p className="mt-2 text-sm text-emerald-900">
          Your company travel policy is now active and ready for agent matching.
        </p>
      </div>
    );
  }

  const totalSteps = QUESTIONS.length + 2;

  return (
    <div className="space-y-6 rounded-3xl border border-border bg-white p-6">
      <div>
        <h2 className="text-xl font-semibold">
          Let&apos;s build your company&apos;s travel policy
        </h2>
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {totalSteps}
        </p>
      </div>

      {step < QUESTIONS.length ? (
        <div className="space-y-2">
          <Label>{QUESTIONS[step]!.label}</Label>
          <Input
            type={QUESTIONS[step]!.type}
            value={values[QUESTIONS[step]!.key] ?? ""}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                [QUESTIONS[step]!.key]: e.target.value,
              }))
            }
          />
        </div>
      ) : step === QUESTIONS.length ? (
        <div className="space-y-3">
          <Label>Do you require employees to stay near conference venues?</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={nearVenue ? "default" : "outline"}
              onClick={() => setNearVenue(true)}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={!nearVenue ? "default" : "outline"}
              onClick={() => setNearVenue(false)}
            >
              No
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Label>Are refundable fares required?</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={refundable ? "default" : "outline"}
              onClick={() => setRefundable(true)}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={!refundable ? "default" : "outline"}
              onClick={() => setRefundable(false)}
            >
              No
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        ) : null}
        {step < totalSteps - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
        ) : (
          <Button
            onClick={async () => {
              await createPolicyFromSurveyAction({
                hotelLimitDollars: Number(values.hotelLimitDollars),
                cabin: values.cabin ?? "",
                businessWhen: values.businessWhen ?? "",
                preferredAirlines: values.preferredAirlines ?? "",
                requireNearVenue: nearVenue,
                distanceMiles: Number(values.distanceMiles),
                managerApprovalDollars: Number(values.managerApprovalDollars),
                refundableRequired: refundable,
              });
              setDone(true);
            }}
          >
            Generate policy
          </Button>
        )}
      </div>
    </div>
  );
}
