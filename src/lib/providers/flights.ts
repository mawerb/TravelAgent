import type { FlightOffer } from "@/types";
import { getDb } from "@/lib/db/client";
import { getFlightsWithCache } from "@/lib/inventory/cache";

export interface FlightProvider {
  searchFlights(input: {
    origin: string;
    destination: string;
    date: string;
    returnDate?: string;
  }): Promise<FlightOffer[]>;
  bookFlight(flightId: string): Promise<{ confirmation: string }>;
  cancelFlight(confirmation: string): Promise<void>;
}

export class MockFlightProvider implements FlightProvider {
  async searchFlights(input: {
    origin: string;
    destination: string;
    date: string;
    returnDate?: string;
  }): Promise<FlightOffer[]> {
    const db = await getDb();
    const hit = await getFlightsWithCache(db, input);
    return hit.items;
  }

  async bookFlight(flightId: string): Promise<{ confirmation: string }> {
    if (flightId === "flt_ua_sfo_las") {
      return { confirmation: "UA7X92L" };
    }
    return { confirmation: `FLT${flightId.slice(-5).toUpperCase()}` };
  }

  async cancelFlight(_confirmation: string): Promise<void> {
    void _confirmation;
  }
}

export function getFlightProvider(): FlightProvider {
  return new MockFlightProvider();
}
