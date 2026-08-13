export const dynamic = "force-dynamic";

import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { EMP_ALEX_ID } from "@/lib/session";
import { formatUsd } from "@/lib/money";
import { StatusPill } from "@/components/ui/status-pill";
import type { Expense } from "@/types";

export default async function ExpensesPage() {
  await ensureDemoSeeded();
  const db = await getDb();
  const expenses = await col<Expense>(db, "expenses")
    .find({ employeeId: EMP_ALEX_ID })
    .sort({ createdAt: -1 })
    .limit(40)
    .toArray();

  // Group by booking
  const byBooking = new Map<string, Expense[]>();
  for (const e of expenses) {
    const list = byBooking.get(e.bookingId) ?? [];
    list.push(e);
    byBooking.set(e.bookingId, list);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground">
          Automatically classified from corporate bookings. No reimbursement
          required.
        </p>
      </header>

      <div className="space-y-4">
        {[...byBooking.entries()].map(([bookingId, lines]) => {
          const total = lines.reduce((s, l) => s + l.amountCents, 0);
          return (
            <div
              key={bookingId}
              className="rounded-3xl border border-border bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="info">Automatically classified</StatusPill>
                  <StatusPill
                    tone={
                      lines[0]?.policyStatus === "compliant"
                        ? "compliant"
                        : "exception"
                    }
                  >
                    {lines[0]?.policyStatus === "compliant"
                      ? "Compliant"
                      : "Exception"}
                  </StatusPill>
                </div>
                <p className="text-sm text-muted-foreground">
                  {lines[0]?.paymentLabel}
                </p>
              </div>
              <ul className="space-y-3">
                {lines.map((line) => (
                  <li
                    key={line._id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {line.category === "air_travel" ? "Air Travel" : "Lodging"}
                      </p>
                      <p className="text-muted-foreground">{line.vendor}</p>
                    </div>
                    <p className="font-semibold">{formatUsd(line.amountCents)}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-border pt-3">
                <span className="font-medium">Total</span>
                <span className="text-lg font-semibold">{formatUsd(total)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                No employee reimbursement required.
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
