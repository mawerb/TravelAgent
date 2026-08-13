"use client";

import { motion } from "framer-motion";
import type { CompanyBudgetLedger } from "@/types";
import { formatUsd } from "@/lib/money";

export function BudgetCard({ ledger }: { ledger: CompanyBudgetLedger }) {
  const pct = Math.min(
    100,
    Math.round((ledger.spentCents / ledger.annualBudgetCents) * 100),
  );

  return (
    <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Corporate travel budget
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Metric label="Annual budget" value={formatUsd(ledger.annualBudgetCents)} />
        <Metric label="Spent" value={formatUsd(ledger.spentCents)} />
        <Metric label="Reserved" value={formatUsd(ledger.reservedCents)} />
        <div>
          <p className="text-xs text-muted-foreground">Remaining</p>
          <motion.p
            key={ledger.availableCents}
            initial={{ scale: 1.05, color: "#047857" }}
            animate={{ scale: 1, color: "#1c1917" }}
            className="text-2xl font-semibold"
          >
            {formatUsd(ledger.availableCents)}
          </motion.p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
        <motion.div
          className="h-full rounded-full bg-stone-900"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
