export type MoneyCents = number;

export type GeoPoint = {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
};

export type Organization = {
  _id: string;
  name: string;
  paymentMethod: {
    brand: "visa";
    last4: "4242";
    label: string;
    testMode: true;
  };
};

export type Employee = {
  _id: string;
  organizationId: string;
  name: string;
  title: string;
  city: string;
  homeAirport: string;
  email: string;
};

export type EmployeeProfile = {
  _id: string;
  employeeId: string;
  organizationId: string;
  homeAirport: string;
  preferredAirlines: string[];
  seat: "aisle" | "window" | "middle";
  preferredHotelBrands: string[];
  typicalBehavior: "proximity_first" | "price_first" | "balanced";
  behaviorExplanation: string;
  inferredPreferences: string[];
  confidence: number;
  tripsAnalyzed: number;
  feedbackCount: number;
  /** Conceptual preference embedding — never shown in UI */
  embedding: number[];
};

export type TravelPolicyRules = {
  flights: {
    economyUnderHours: number;
    premiumEconomyOverHours: number;
    businessRequiresVpApproval: boolean;
    preferredAirlines: string[];
    refundableRequired: boolean;
  };
  hotels: {
    standardMaxCents: MoneyCents;
    cityCapsCents: Record<string, MoneyCents>;
    conferenceExceedPercent: number;
    conferenceRadiusMiles: number;
  };
  transportation: {
    ridesharePermitted: boolean;
    rentalRequiresJustification: boolean;
  };
  approval: {
    managerApprovalAboveCents: MoneyCents;
    outOfPolicyRequiresJustification: boolean;
  };
};

export type TravelPolicy = {
  _id: string;
  organizationId: string;
  status: "active" | "draft";
  source: string;
  /** Public URL or path to view the source PDF */
  sourceUrl?: string;
  rules: TravelPolicyRules;
  createdAt: string;
  updatedAt: string;
};

export type Venue = {
  _id: string;
  name: string;
  city: string;
  location: GeoPoint;
};

export type HotelRoom = {
  name: string;
  bedType: string;
  sleeps: number;
  refundable: boolean;
  breakfastIncluded: boolean;
  description?: string;
};

export type Hotel = {
  _id: string;
  name: string;
  brand: string;
  city: string;
  location: GeoPoint;
  nightlyRateCents: MoneyCents;
  stars: number;
  freeCancellation: boolean;
  characteristics: string[];
  amenities: string[];
  address?: string;
  neighborhood?: string;
  room: HotelRoom;
  /**
   * Stable brand property page — shareable; does not depend on a booking session.
   */
  listingUrl?: string;
  /**
   * Optional dated availability/rates deep link (may redirect; prefer listingUrl to share).
   */
  url?: string;
};

export type FlightOffer = {
  id: string;
  airline: string;
  origin: string;
  destination: string;
  departTime: string;
  arriveTime: string;
  durationMinutes: number;
  stops: number;
  cabin: "economy" | "premium_economy" | "business";
  priceCents: MoneyCents;
  inventory: number;
  /** Public search / airline page so users can verify the route */
  url?: string;
};

export type ParsedTripRequest = {
  originAirport: string;
  destinationCity: string;
  destinationAirport: string;
  startDate: string;
  endDate: string;
  purpose: string;
  venueName?: string;
  preferredAirline?: string;
  proximityPreferred: boolean;
  rawQuery: string;
};

export type PolicyCheckResult = {
  compliant: boolean;
  status: "compliant" | "exception" | "out_of_policy";
  reasons: string[];
  hotelMaxCents: MoneyCents;
  conferenceRadiusMiles: number;
  allowanceCents: MoneyCents;
  requiresManagerApproval: boolean;
};

export type ScoreBreakdown = {
  policyCompliance: number;
  preferenceSimilarity: number;
  proximityScore: number;
  priceScore: number;
  historicalFeedbackScore: number;
  finalScore: number;
  matchPercent: number;
};

export type TripCandidate = {
  _id: string;
  tripRequestId: string;
  organizationId: string;
  employeeId: string;
  label: "recommended" | "lowest_cost" | "best_location" | "alternative";
  flight: FlightOffer;
  hotel: Hotel & { distanceMiles: number };
  nights: number;
  startDate: string;
  endDate: string;
  flightCents: MoneyCents;
  hotelCents: MoneyCents;
  totalCents: MoneyCents;
  allowanceCents: MoneyCents;
  savingsCents: MoneyCents;
  policy: PolicyCheckResult;
  scores: ScoreBreakdown;
  explanationChips: string[];
  whyThisTrip: string;
  embedding: number[];
  createdAt: string;
};

export type TripRequest = {
  _id: string;
  organizationId: string;
  employeeId: string;
  query: string;
  parsed: ParsedTripRequest;
  venueId?: string;
  status: "searching" | "ready" | "booked" | "cancelled";
  createdAt: string;
};

export type BookingState =
  | "READY"
  | "VALIDATING"
  | "PAYMENT_AUTHORIZING"
  | "PAYMENT_AUTHORIZED"
  | "BOOKING_FLIGHT"
  | "FLIGHT_BOOKED"
  | "BOOKING_HOTEL"
  | "HOTEL_BOOKED"
  | "PAYMENT_CAPTURE"
  | "CONFIRMED"
  | "FAILED"
  | "ROLLBACK_REQUIRED";

export type Booking = {
  _id: string;
  bookingAttemptId: string;
  organizationId: string;
  employeeId: string;
  tripRequestId: string;
  candidateId: string;
  state: BookingState;
  originCity: string;
  destinationCity: string;
  purpose: string;
  startDate: string;
  endDate: string;
  flight: FlightOffer & { confirmation?: string };
  hotel: {
    name: string;
    brand: string;
    distanceMiles: number;
    nightlyRateCents: MoneyCents;
    confirmation?: string;
    /** Stable property page */
    listingUrl?: string;
    /** Dated rates link (optional) */
    url?: string;
    roomName?: string;
    bedType?: string;
    amenities?: string[];
    address?: string;
  };
  flightCents: MoneyCents;
  hotelCents: MoneyCents;
  totalCents: MoneyCents;
  policyStatus: "compliant" | "exception" | "out_of_policy";
  paymentLast4: string;
  testMode: true;
  createdAt: string;
  confirmedAt?: string;
  error?: string;
};

export type PaymentAttempt = {
  _id: string;
  bookingAttemptId: string;
  organizationId: string;
  amountCents: MoneyCents;
  stripePaymentIntentId: string;
  status: "requires_capture" | "succeeded" | "failed" | "canceled";
  testMode: true;
  createdAt: string;
};

export type Expense = {
  _id: string;
  organizationId: string;
  employeeId: string;
  bookingId: string;
  category: "air_travel" | "lodging";
  vendor: string;
  amountCents: MoneyCents;
  status: "automatically_classified";
  policyStatus: "compliant" | "exception" | "out_of_policy";
  paymentLabel: string;
  reimbursementRequired: false;
  createdAt: string;
};

export type Feedback = {
  _id: string;
  organizationId: string;
  employeeId: string;
  bookingId: string;
  flightStars: number;
  hotelStars: number;
  policyMadeHarder: boolean;
  frictionNote?: string;
  createdAt: string;
};

export type PolicySuggestion = {
  _id: string;
  organizationId: string;
  title: string;
  topic: string;
  currentPolicy: string;
  tripsAnalyzed: number;
  exceptionRequests: number;
  employeesMentioned: number;
  medianApprovedHotelCents: MoneyCents;
  recommendation: string;
  predictedImpact: string[];
  status: "open" | "reviewed" | "dismissed";
  createdAt: string;
};

export type CompanyBudgetLedger = {
  _id: string;
  organizationId: string;
  annualBudgetCents: MoneyCents;
  spentCents: MoneyCents;
  reservedCents: MoneyCents;
  availableCents: MoneyCents;
  updatedAt: string;
};

export type AgentActivityStep = {
  id: string;
  title: string;
  detail: string;
  status: "pending" | "active" | "done";
};

/** Structured agent follow-ups — speakable later via ElevenLabs. */
export type ClarifyingQuestion = {
  id: string;
  field: "dates" | "route" | "purpose" | "prefs";
  prompt: string;
  answer: string;
};

export type TripConfirmation = {
  parsed: ParsedTripRequest;
  summary: string;
  questions: ClarifyingQuestion[];
};

export type SearchResult = {
  tripRequestId: string;
  steps: AgentActivityStep[];
  recommended: TripCandidate;
  alternatives: TripCandidate[];
};
