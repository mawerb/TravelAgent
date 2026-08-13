import type { Booking } from "@/types";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";

export async function getUpcomingBooking(
  employeeId: string,
): Promise<Booking | null> {
  try {
    const db = await getDb();
    const today = new Date().toISOString().slice(0, 10);
    return col<Booking>(db, "bookings").findOne(
      {
        employeeId,
        state: "CONFIRMED",
        endDate: { $gte: today },
      },
      { sort: { startDate: 1 } },
    );
  } catch {
    return null;
  }
}

export async function listBookings(employeeId: string): Promise<Booking[]> {
  const db = await getDb();
  return col<Booking>(db, "bookings")
    .find({ employeeId, state: { $in: ["CONFIRMED", "FAILED"] } })
    .sort({ startDate: -1 })
    .toArray();
}

export async function getBooking(id: string): Promise<Booking | null> {
  const db = await getDb();
  return col<Booking>(db, "bookings").findOne({ _id: id });
}
