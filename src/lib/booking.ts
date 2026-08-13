import { randomUUID } from "crypto";
import type {
  ApprovalRequest,
  Booking,
  BookingState,
  CompanyBudgetLedger,
  Expense,
  PaymentAttempt,
  TripCandidate,
  TripRequest,
  TravelPolicy,
} from "@/types";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import { getFlightProvider } from "@/lib/providers/flights";
import { getHotelProvider } from "@/lib/providers/hotels";
import { getStripeAdapter } from "@/lib/stripe";
import { getDemoOrgDef } from "@/lib/demo-orgs";
import { getDemoSession } from "@/lib/session";
import { validateItinerary } from "@/lib/policy";
import { formatUsd } from "@/lib/money";
import {
  appBaseUrl,
  bookingConfirmationSms,
  resolveSmsTo,
  sendSms,
} from "@/lib/sms/twilio";

export type BookingProgressEvent = {
  state: BookingState;
  message: string;
};

export type BookingResult =
  | {
      kind: "booked";
      booking: Booking;
      events: BookingProgressEvent[];
    }
  | {
      kind: "needs_approval";
      request: ApprovalRequest;
      events: BookingProgressEvent[];
    };

export async function BookingOrchestrator(input: {
  candidateId: string;
  bookingAttemptId?: string;
  /** Skip OOP/manager gate after a manager approved this request */
  approvedRequestId?: string;
  justification?: string;
}): Promise<BookingResult> {
  const db = await getDb();
  const bookingAttemptId = input.bookingAttemptId ?? `ba_${randomUUID()}`;
  const events: BookingProgressEvent[] = [];

  const existing = await col<Booking>(db, "bookings").findOne({
    bookingAttemptId,
  });
  if (existing?.state === "CONFIRMED") {
    return {
      kind: "booked",
      booking: existing,
      events: [{ state: "CONFIRMED", message: "Already confirmed" }],
    };
  }

  const push = (state: BookingState, message: string) => {
    events.push({ state, message });
  };

  push("READY", "Starting booking");
  push("VALIDATING", "Reloading itinerary and validating");

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

  if (candidate.flight.inventory <= 0) {
    push("FAILED", "Flight inventory unavailable");
    throw Object.assign(new Error("Flight sold out"), { events });
  }

  const totalCents = candidate.flightCents + candidate.hotelCents;
  if (totalCents !== candidate.totalCents) {
    push("FAILED", "Price mismatch");
    throw Object.assign(new Error("Price recalculation failed"), { events });
  }

  const orgDef = getDemoOrgDef(candidate.organizationId);
  const session = await getDemoSession();

  const policy = await col<TravelPolicy>(db, "travelPolicies").findOne({
    organizationId: orgDef.organization._id,
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

  const needsManager =
    policyResult.status === "out_of_policy" ||
    policyResult.requiresManagerApproval;

  if (needsManager) {
    if (input.approvedRequestId) {
      const approved = await col<ApprovalRequest>(db, "approvalRequests").findOne({
        _id: input.approvedRequestId,
        candidateId: candidate._id,
        status: "approved",
      });
      if (!approved) {
        push("FAILED", "Manager approval missing");
        throw Object.assign(new Error("Manager approval required"), { events });
      }
      push("VALIDATING", "Manager approval verified");
    } else {
      const request = await upsertApprovalRequest({
        candidate,
        tripRequest,
        orgDef,
        employeeName: session.employee.name,
        policyResult,
        justification: input.justification,
      });
      push("FAILED", "Sent to manager for approval");
      return { kind: "needs_approval", request, events };
    }
  } else {
    push("VALIDATING", "Policy verified");
  }

  const ledger = await col<CompanyBudgetLedger>(
    db,
    "companyBudgetLedger",
  ).findOne({ _id: orgDef.ledgerId });
  if (!ledger || ledger.availableCents < totalCents) {
    push("FAILED", "Insufficient corporate travel budget");
    throw Object.assign(new Error("Insufficient budget"), { events });
  }

  const booking: Booking = {
    _id: `book_${bookingAttemptId}`,
    bookingAttemptId,
    organizationId: orgDef.organization._id,
    employeeId: candidate.employeeId || session.employee._id,
    tripRequestId: tripRequest._id,
    candidateId: candidate._id,
    state: "VALIDATING",
    originCity: session.employee.city.split(",")[0] ?? "Origin",
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
    paymentLast4: orgDef.organization.paymentMethod.last4,
    testMode: true,
    createdAt: new Date().toISOString(),
  };

  try {
    await col<Booking>(db, "bookings").insertOne(booking);
  } catch (err) {
    const again = await col<Booking>(db, "bookings").findOne({
      bookingAttemptId,
    });
    if (again?.state === "CONFIRMED") {
      return { kind: "booked", booking: again, events };
    }
    throw err;
  }

  const stripe = getStripeAdapter();
  const flights = getFlightProvider();
  const hotels = getHotelProvider(db);

  try {
    push("PAYMENT_AUTHORIZING", "Authorizing corporate payment");
    await col<Booking>(db, "bookings").updateOne(
      { bookingAttemptId },
      { $set: { state: "PAYMENT_AUTHORIZING" } },
    );

    const auth = await stripe.authorize({
      amountCents: totalCents,
      bookingAttemptId,
      description: `${orgDef.organization.name} travel ${tripRequest.parsed.originAirport}-${tripRequest.parsed.destinationAirport}`,
    });

    const payment: PaymentAttempt = {
      _id: `pay_${bookingAttemptId}`,
      bookingAttemptId,
      organizationId: orgDef.organization._id,
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
      { _id: orgDef.ledgerId, availableCents: { $gte: totalCents } },
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

    if (input.approvedRequestId) {
      await col<ApprovalRequest>(db, "approvalRequests").updateOne(
        { _id: input.approvedRequestId },
        { $set: { bookingId: booking._id } },
      );
    }

    const payLabel = `${orgDef.organization.paymentMethod.label} •••• ${orgDef.organization.paymentMethod.last4}`;
    const expenses: Expense[] = [
      {
        _id: `exp_air_${bookingAttemptId}`,
        organizationId: orgDef.organization._id,
        employeeId: booking.employeeId,
        bookingId: booking._id,
        category: "air_travel",
        vendor: `${candidate.flight.airline} Airlines`,
        amountCents: candidate.flightCents,
        status: "automatically_classified",
        policyStatus: policyResult.status,
        paymentLabel: payLabel,
        reimbursementRequired: false,
        createdAt: new Date().toISOString(),
      },
      {
        _id: `exp_hotel_${bookingAttemptId}`,
        organizationId: orgDef.organization._id,
        employeeId: booking.employeeId,
        bookingId: booking._id,
        category: "lodging",
        vendor: candidate.hotel.brand,
        amountCents: candidate.hotelCents,
        status: "automatically_classified",
        policyStatus: policyResult.status,
        paymentLabel: payLabel,
        reimbursementRequired: false,
        createdAt: new Date().toISOString(),
      },
    ];
    await col<Expense>(db, "expenses").insertMany(expenses);

    push("CONFIRMED", "You're booked.");

    // Non-blocking booking confirmation SMS
    try {
      const to = resolveSmsTo(session.employee.phone);
      if (to) {
        await sendSms({
          to,
          purpose: "booking",
          body: bookingConfirmationSms({
            name: session.employee.name,
            route: `${booking.flight.origin} → ${booking.flight.destination}`,
            dates: `${booking.startDate} → ${booking.endDate}`,
            hotel: booking.hotel.name,
            airline: booking.flight.airline,
            confirmation: booking.flight.confirmation,
            tripUrl: `${appBaseUrl()}/trips/${booking._id}`,
            totalLabel: formatUsd(booking.totalCents),
          }),
        });
      }
    } catch (err) {
      console.warn("[sms] booking confirmation failed", err);
    }

    return { kind: "booked", booking, events };
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

async function upsertApprovalRequest(input: {
  candidate: TripCandidate;
  tripRequest: TripRequest;
  orgDef: ReturnType<typeof getDemoOrgDef>;
  employeeName: string;
  policyResult: ReturnType<typeof validateItinerary>;
  justification?: string;
}): Promise<ApprovalRequest> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = `apr_${input.candidate._id}`;
  const existing = await col<ApprovalRequest>(db, "approvalRequests").findOne({
    _id: id,
  });
  if (existing?.status === "pending") {
    return existing;
  }

  const request: ApprovalRequest = {
    _id: id,
    organizationId: input.orgDef.organization._id,
    employeeId: input.candidate.employeeId,
    employeeName: input.employeeName,
    managerName: input.orgDef.manager.name,
    managerTitle: input.orgDef.manager.title,
    candidateId: input.candidate._id,
    tripRequestId: input.tripRequest._id,
    status: "pending",
    reasons: input.policyResult.reasons.filter((r) => r !== "Within travel policy"),
    policyStatus:
      input.policyResult.status === "out_of_policy" ? "out_of_policy" : "exception",
    justification: input.justification,
    summary: {
      route: `${input.candidate.flight.origin} → ${input.candidate.flight.destination}`,
      hotelName: input.candidate.hotel.name,
      airline: input.candidate.flight.airline,
      startDate: input.candidate.startDate,
      endDate: input.candidate.endDate,
      totalCents: input.candidate.totalCents,
      nightlyRateCents: input.candidate.hotel.nightlyRateCents,
    },
    createdAt: now,
  };

  await col<ApprovalRequest>(db, "approvalRequests").updateOne(
    { _id: id },
    { $set: request },
    { upsert: true },
  );
  return request;
}
