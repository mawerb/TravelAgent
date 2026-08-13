import { randomUUID } from "crypto";
import type {
  Booking,
  BookingState,
  CompanyBudgetLedger,
  Expense,
  PaymentAttempt,
  TripCandidate,
  TripRequest,
} from "@/types";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { getFlightProvider } from "@/lib/providers/flights";
import { getHotelProvider } from "@/lib/providers/hotels";
import { getStripeAdapter } from "@/lib/stripe";
import { DEMO_ORG, EMP_ALEX_ID, LEDGER_ACME_ID, ORG_ACME_ID } from "@/lib/session";
import { validateItinerary } from "@/lib/policy";
import type { TravelPolicy } from "@/types";

export type BookingProgressEvent = {
  state: BookingState;
  message: string;
};

export type BookingResult = {
  booking: Booking;
  events: BookingProgressEvent[];
};

export async function BookingOrchestrator(input: {
  candidateId: string;
  bookingAttemptId?: string;
}): Promise<BookingResult> {
  const db = await getDb();
  const bookingAttemptId = input.bookingAttemptId ?? `ba_${randomUUID()}`;
  const events: BookingProgressEvent[] = [];

  const existing = await col<Booking>(db, "bookings").findOne({
    bookingAttemptId,
  });
  if (existing?.state === "CONFIRMED") {
    return { booking: existing, events: [{ state: "CONFIRMED", message: "Already confirmed" }] };
  }

  const push = (state: BookingState, message: string) => {
    events.push({ state, message });
  };

  push("READY", "Starting booking");
  push("VALIDATING", "Reloading itinerary and validating");

  // 1. Reload selected itinerary from database — never trust client price
  const candidate = await col<TripCandidate>(db, "tripCandidates").findOne({
    _id: input.candidateId,
  });
  if (!candidate) {
    push("FAILED", "Itinerary not found");
    throw Object.assign(new Error("Itinerary not found"), { events });
  }

  const tripRequest = await col<TripRequest>(db, "tripRequests").findOne({
    _id: candidate.tripRequestId,
  });
  if (!tripRequest) {
    push("FAILED", "Trip request not found");
    throw Object.assign(new Error("Trip request not found"), { events });
  }

  // 2. Check inventory
  if (candidate.flight.inventory <= 0) {
    push("FAILED", "Flight inventory unavailable");
    throw Object.assign(new Error("Flight sold out"), { events });
  }

  // 3. Recalculate price from stored candidate (server source of truth)
  const totalCents = candidate.flightCents + candidate.hotelCents;
  if (totalCents !== candidate.totalCents) {
    push("FAILED", "Price mismatch");
    throw Object.assign(new Error("Price recalculation failed"), { events });
  }

  // 4. Re-run policy validation
  const policy = await col<TravelPolicy>(db, "travelPolicies").findOne({
    organizationId: ORG_ACME_ID,
    status: "active",
  });
  if (!policy) {
    push("FAILED", "No active policy");
    throw Object.assign(new Error("No active policy"), { events });
  }

  const policyResult = validateItinerary({
    policy,
    parsed: tripRequest.parsed,
    flight: candidate.flight,
    hotelNightlyCents: candidate.hotel.nightlyRateCents,
    hotelDistanceMiles: candidate.hotel.distanceMiles,
    totalCents,
    nights: candidate.nights,
  });
  if (policyResult.status === "out_of_policy") {
    push("FAILED", "Out of policy");
    throw Object.assign(new Error("Booking out of policy"), { events });
  }
  push("VALIDATING", "Policy verified");

  // 5. Check corporate demo budget
  const ledger = await col<CompanyBudgetLedger>(
    db,
    "companyBudgetLedger",
  ).findOne({ _id: LEDGER_ACME_ID });
  if (!ledger || ledger.availableCents < totalCents) {
    push("FAILED", "Insufficient corporate travel budget");
    throw Object.assign(new Error("Insufficient budget"), { events });
  }

  const booking: Booking = {
    _id: `book_${bookingAttemptId}`,
    bookingAttemptId,
    organizationId: ORG_ACME_ID,
    employeeId: EMP_ALEX_ID,
    tripRequestId: tripRequest._id,
    candidateId: candidate._id,
    state: "VALIDATING",
    originCity: "San Francisco",
    destinationCity: tripRequest.parsed.destinationCity,
    purpose: tripRequest.parsed.purpose,
    startDate: tripRequest.parsed.startDate,
    endDate: tripRequest.parsed.endDate,
    flight: { ...candidate.flight },
    hotel: {
      name: candidate.hotel.name,
      brand: candidate.hotel.brand,
      distanceMiles: candidate.hotel.distanceMiles,
      nightlyRateCents: candidate.hotel.nightlyRateCents,
      listingUrl: candidate.hotel.listingUrl,
      url: candidate.hotel.url,
      roomName: candidate.hotel.room?.name,
      bedType: candidate.hotel.room?.bedType,
      amenities: candidate.hotel.amenities,
      address: candidate.hotel.address,
    },
    flightCents: candidate.flightCents,
    hotelCents: candidate.hotelCents,
    totalCents,
    policyStatus: policyResult.status,
    paymentLast4: DEMO_ORG.paymentMethod.last4,
    testMode: true,
    createdAt: new Date().toISOString(),
  };

  try {
    await col<Booking>(db, "bookings").insertOne(booking);
  } catch (err) {
    const again = await col<Booking>(db, "bookings").findOne({
      bookingAttemptId,
    });
    if (again?.state === "CONFIRMED") return { booking: again, events };
    throw err;
  }

  const stripe = getStripeAdapter();
  const flights = getFlightProvider();
  const hotels = getHotelProvider(db);

  try {
    // 6–7. PaymentIntent authorize
    push("PAYMENT_AUTHORIZING", "Authorizing corporate payment");
    await col<Booking>(db, "bookings").updateOne(
      { bookingAttemptId },
      { $set: { state: "PAYMENT_AUTHORIZING" } },
    );

    const auth = await stripe.authorize({
      amountCents: totalCents,
      bookingAttemptId,
      description: `Acme travel ${tripRequest.parsed.originAirport}-${tripRequest.parsed.destinationAirport}`,
    });

    const payment: PaymentAttempt = {
      _id: `pay_${bookingAttemptId}`,
      bookingAttemptId,
      organizationId: ORG_ACME_ID,
      amountCents: totalCents,
      stripePaymentIntentId: auth.paymentIntentId,
      status: "requires_capture",
      testMode: true,
      createdAt: new Date().toISOString(),
    };
    await col<PaymentAttempt>(db, "paymentAttempts").insertOne(payment);

    push("PAYMENT_AUTHORIZED", "Corporate payment authorized");
    await col<Booking>(db, "bookings").updateOne(
      { bookingAttemptId },
      { $set: { state: "PAYMENT_AUTHORIZED" } },
    );

    // 8. Mock book flight
    push("BOOKING_FLIGHT", "Reserving flight");
    await col<Booking>(db, "bookings").updateOne(
      { bookingAttemptId },
      { $set: { state: "BOOKING_FLIGHT" } },
    );
    const flightBook = await flights.bookFlight(candidate.flight.id);
    booking.flight.confirmation = flightBook.confirmation;
    push("FLIGHT_BOOKED", `${candidate.flight.airline} flight reserved`);
    await col<Booking>(db, "bookings").updateOne(
      { bookingAttemptId },
      {
        $set: {
          state: "FLIGHT_BOOKED",
          "flight.confirmation": flightBook.confirmation,
        },
      },
    );

    // 9. Mock book hotel
    push("BOOKING_HOTEL", "Reserving hotel");
    await col<Booking>(db, "bookings").updateOne(
      { bookingAttemptId },
      { $set: { state: "BOOKING_HOTEL" } },
    );
    const hotelBook = await hotels.bookHotel(candidate.hotel._id);
    booking.hotel.confirmation = hotelBook.confirmation;
    push("HOTEL_BOOKED", "Hotel reserved");
    await col<Booking>(db, "bookings").updateOne(
      { bookingAttemptId },
      {
        $set: {
          state: "HOTEL_BOOKED",
          "hotel.confirmation": hotelBook.confirmation,
        },
      },
    );

    // 10. Capture Stripe payment
    push("PAYMENT_CAPTURE", "Capturing payment");
    await col<Booking>(db, "bookings").updateOne(
      { bookingAttemptId },
      { $set: { state: "PAYMENT_CAPTURE" } },
    );
    await stripe.capture(auth.paymentIntentId);
    await col<PaymentAttempt>(db, "paymentAttempts").updateOne(
      { bookingAttemptId },
      { $set: { status: "succeeded" } },
    );

    // 11–12. Save booking + update ledger
    booking.state = "CONFIRMED";
    booking.confirmedAt = new Date().toISOString();
    await col<Booking>(db, "bookings").updateOne(
      { bookingAttemptId },
      {
        $set: {
          state: "CONFIRMED",
          confirmedAt: booking.confirmedAt,
          flight: booking.flight,
          hotel: booking.hotel,
        },
      },
    );

    await col<CompanyBudgetLedger>(db, "companyBudgetLedger").updateOne(
      { _id: LEDGER_ACME_ID, availableCents: { $gte: totalCents } },
      {
        $inc: {
          spentCents: totalCents,
          availableCents: -totalCents,
        },
        $set: { updatedAt: new Date().toISOString() },
      },
    );

    await col<TripRequest>(db, "tripRequests").updateOne(
      { _id: tripRequest._id },
      { $set: { status: "booked" } },
    );

    // Auto expenses
    const expenses: Expense[] = [
      {
        _id: `exp_air_${bookingAttemptId}`,
        organizationId: ORG_ACME_ID,
        employeeId: EMP_ALEX_ID,
        bookingId: booking._id,
        category: "air_travel",
        vendor: `${candidate.flight.airline} Airlines`,
        amountCents: candidate.flightCents,
        status: "automatically_classified",
        policyStatus: policyResult.status,
        paymentLabel: "Corporate Visa •••• 4242",
        reimbursementRequired: false,
        createdAt: new Date().toISOString(),
      },
      {
        _id: `exp_hotel_${bookingAttemptId}`,
        organizationId: ORG_ACME_ID,
        employeeId: EMP_ALEX_ID,
        bookingId: booking._id,
        category: "lodging",
        vendor: candidate.hotel.brand,
        amountCents: candidate.hotelCents,
        status: "automatically_classified",
        policyStatus: policyResult.status,
        paymentLabel: "Corporate Visa •••• 4242",
        reimbursementRequired: false,
        createdAt: new Date().toISOString(),
      },
    ];
    await col<Expense>(db, "expenses").insertMany(expenses);

    push("CONFIRMED", "You're booked.");
    return { booking, events };
  } catch (err) {
    push("ROLLBACK_REQUIRED", "Booking failed — rollback required");
    await col<Booking>(db, "bookings").updateOne(
      { bookingAttemptId },
      {
        $set: {
          state: "ROLLBACK_REQUIRED",
          error: err instanceof Error ? err.message : "Unknown error",
        },
      },
    );
    throw Object.assign(
      err instanceof Error ? err : new Error("Booking failed"),
      { events },
    );
  }
}
