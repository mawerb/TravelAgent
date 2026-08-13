import type { FlightOffer } from "@/types";
import { dollarsToCents } from "@/lib/money";

export interface FlightProvider {
  searchFlights(input: {
    origin: string;
    destination: string;
    date: string;
  }): Promise<FlightOffer[]>;
  bookFlight(flightId: string): Promise<{ confirmation: string }>;
  cancelFlight(confirmation: string): Promise<void>;
}

const DEMO_FLIGHTS: FlightOffer[] = [
  {
    id: "flt_ua_sfo_las",
    airline: "United",
    origin: "SFO",
    destination: "LAS",
    departTime: "09:10",
    arriveTime: "10:42",
    durationMinutes: 92,
    stops: 0,
    cabin: "economy",
    priceCents: dollarsToCents(346),
    inventory: 8,
  },
  {
    id: "flt_aa_sfo_las",
    airline: "American",
    origin: "SFO",
    destination: "LAS",
    departTime: "07:45",
    arriveTime: "09:20",
    durationMinutes: 95,
    stops: 0,
    cabin: "economy",
    priceCents: dollarsToCents(298),
    inventory: 5,
  },
  {
    id: "flt_dl_sfo_las",
    airline: "Delta",
    origin: "SFO",
    destination: "LAS",
    departTime: "11:30",
    arriveTime: "13:05",
    durationMinutes: 95,
    stops: 0,
    cabin: "economy",
    priceCents: dollarsToCents(362),
    inventory: 4,
  },
  {
    id: "flt_ua_sfo_las_pm",
    airline: "United",
    origin: "SFO",
    destination: "LAS",
    departTime: "16:20",
    arriveTime: "17:55",
    durationMinutes: 95,
    stops: 0,
    cabin: "economy",
    priceCents: dollarsToCents(329),
    inventory: 6,
  },
];

export class MockFlightProvider implements FlightProvider {
  async searchFlights(input: {
    origin: string;
    destination: string;
    date: string;
  }): Promise<FlightOffer[]> {
    void input.date;
    return DEMO_FLIGHTS.filter(
      (f) =>
        f.origin === input.origin && f.destination === input.destination,
    );
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
