import type {
  Booking,
  CompanyBudgetLedger,
  Employee,
  EmployeeProfile,
  Expense,
  Feedback,
  Hotel,
  Organization,
  PolicySuggestion,
  TravelPolicy,
  Venue,
} from "@/types";
import { dollarsToCents } from "@/lib/money";
import { ensureIndexes } from "@/lib/db/indexes";
import { getDb } from "@/lib/db/client";
import { col } from "@/lib/db/collections";
import {
  EMP_ALEX_ID,
  LEDGER_ACME_ID,
  ORG_ACME_ID,
  POLICY_ACME_ID,
  VENUE_MDB_LOCAL_VEGAS,
} from "@/lib/session";
import { ALEX_EMBEDDING } from "@/lib/vector";
import { HOTEL_URLS, POLICY_PDF_PATH } from "@/lib/links";
import { HOTEL_DETAILS } from "@/lib/hotel-details";

// MongoDB.local Las Vegas venue (near Las Vegas Convention Center area)
const VEGAS_VENUE: [number, number] = [-115.1537, 36.1315];

function point(lng: number, lat: number) {
  return { type: "Point" as const, coordinates: [lng, lat] as [number, number] };
}

export async function seedDemoData(): Promise<{ ok: true }> {
  const db = await getDb();
  await ensureIndexes(db);

  const collections = [
    "organizations",
    "employees",
    "employeeProfiles",
    "travelPolicies",
    "venues",
    "hotels",
    "tripRequests",
    "tripCandidates",
    "bookings",
    "paymentAttempts",
    "expenses",
    "feedback",
    "policySuggestions",
    "companyBudgetLedger",
  ];
  for (const name of collections) {
    await db.collection(name).deleteMany({});
  }
  // Brief yield so concurrent ensureDemoSeeded callers share one seed promise
  await new Promise((r) => setTimeout(r, 0));

  const org: Organization = {
    _id: ORG_ACME_ID,
    name: "Acme Technologies",
    paymentMethod: {
      brand: "visa",
      last4: "4242",
      label: "Acme Corporate Travel",
      testMode: true,
    },
  };

  const employees: Employee[] = [
    {
      _id: EMP_ALEX_ID,
      organizationId: ORG_ACME_ID,
      name: "Alex Morgan",
      title: "Senior Software Engineer",
      city: "San Francisco, CA",
      homeAirport: "SFO",
      email: "alex.morgan@acme.tech",
    },
    {
      _id: "emp_jordan",
      organizationId: ORG_ACME_ID,
      name: "Jordan Lee",
      title: "Product Manager",
      city: "New York, NY",
      homeAirport: "JFK",
      email: "jordan.lee@acme.tech",
    },
    {
      _id: "emp_priya",
      organizationId: ORG_ACME_ID,
      name: "Priya Shah",
      title: "Solutions Architect",
      city: "Austin, TX",
      homeAirport: "AUS",
      email: "priya.shah@acme.tech",
    },
    {
      _id: "emp_marcus",
      organizationId: ORG_ACME_ID,
      name: "Marcus Johnson",
      title: "Engineering Manager",
      city: "Seattle, WA",
      homeAirport: "SEA",
      email: "marcus.johnson@acme.tech",
    },
  ];

  const profiles: EmployeeProfile[] = [
    {
      _id: "profile_alex",
      employeeId: EMP_ALEX_ID,
      organizationId: ORG_ACME_ID,
      homeAirport: "SFO",
      preferredAirlines: ["United", "Alaska"],
      seat: "aisle",
      preferredHotelBrands: ["Hilton", "Marriott"],
      typicalBehavior: "proximity_first",
      behaviorExplanation:
        "You usually choose hotels closer to your destination even when they cost slightly more.",
      inferredPreferences: [
        "Morning departures",
        "Nonstop flights strongly preferred",
        "Free hotel cancellation",
        "Avoid arrivals after 9 PM",
      ],
      confidence: 0.91,
      tripsAnalyzed: 14,
      feedbackCount: 9,
      embedding: ALEX_EMBEDDING,
    },
    {
      _id: "profile_jordan",
      employeeId: "emp_jordan",
      organizationId: ORG_ACME_ID,
      homeAirport: "JFK",
      preferredAirlines: ["Delta", "JetBlue"],
      seat: "window",
      preferredHotelBrands: ["Marriott", "Hyatt"],
      typicalBehavior: "balanced",
      behaviorExplanation: "Balances price and location depending on trip purpose.",
      inferredPreferences: ["Evening flights OK", "Loyalty hotels preferred"],
      confidence: 0.78,
      tripsAnalyzed: 11,
      feedbackCount: 6,
      embedding: [0.3, 0.2, 0.4, 0.4, 1, 0.5, 0.8, 1, 0.6, 0.7],
    },
    {
      _id: "profile_priya",
      employeeId: "emp_priya",
      organizationId: ORG_ACME_ID,
      homeAirport: "AUS",
      preferredAirlines: ["American", "United"],
      seat: "aisle",
      preferredHotelBrands: ["Hilton"],
      typicalBehavior: "price_first",
      behaviorExplanation: "Often selects the lowest compliant option.",
      inferredPreferences: ["Refundable fares", "Early check-in"],
      confidence: 0.72,
      tripsAnalyzed: 9,
      feedbackCount: 5,
      embedding: [0.7, 0.2, 1, 1, 0.3, 0.8, 0.7, 1, 0.4, 0.8],
    },
    {
      _id: "profile_marcus",
      employeeId: "emp_marcus",
      organizationId: ORG_ACME_ID,
      homeAirport: "SEA",
      preferredAirlines: ["Alaska", "United"],
      seat: "aisle",
      preferredHotelBrands: ["Marriott", "Hilton"],
      typicalBehavior: "proximity_first",
      behaviorExplanation: "Prefers walking distance for customer visits.",
      inferredPreferences: ["Nonstop only", "Morning meetings"],
      confidence: 0.85,
      tripsAnalyzed: 16,
      feedbackCount: 10,
      embedding: [0.8, 1, 1, 0.8, 1, 1, 1, 1, 0.9, 1],
    },
  ];

  const policy: TravelPolicy = {
    _id: POLICY_ACME_ID,
    organizationId: ORG_ACME_ID,
    status: "active",
    source: "Acme_Travel_Policy_2026.pdf",
    sourceUrl: POLICY_PDF_PATH,
    rules: {
      flights: {
        economyUnderHours: 6,
        premiumEconomyOverHours: 6,
        businessRequiresVpApproval: true,
        preferredAirlines: ["United", "Delta"],
        refundableRequired: false,
      },
      hotels: {
        // Spec: standard $250; SF $325 listed separately; Insights friction uses SF $250 narrative.
        // We keep standardMax $250 and city caps for NYC/SF used by validation.
        // Conference may exceed by 15% — Vegas conference → ~$287.5, demo hotel $246 ok.
        // Insights card references "Current policy: $250/night" for SF friction.
        standardMaxCents: dollarsToCents(250),
        cityCapsCents: {
          "san francisco": dollarsToCents(250),
          "new york": dollarsToCents(350),
          "las vegas": dollarsToCents(300),
        },
        conferenceExceedPercent: 15,
        conferenceRadiusMiles: 1,
      },
      transportation: {
        ridesharePermitted: true,
        rentalRequiresJustification: true,
      },
      approval: {
        managerApprovalAboveCents: dollarsToCents(2500),
        outOfPolicyRequiresJustification: true,
      },
    },
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
  };

  const venues: Venue[] = [
    {
      _id: VENUE_MDB_LOCAL_VEGAS,
      name: "MongoDB.local",
      city: "Las Vegas",
      location: point(...VEGAS_VENUE),
    },
  ];

  // Hotels around Las Vegas venue — distances designed for demo
  const hotels: Hotel[] = [
    {
      _id: "hotel_hilton_vegas_near",
      name: "Hilton Grand Vacations Club Elara",
      brand: "Hilton",
      city: "Las Vegas",
      // ~0.3 mi from venue
      location: point(-115.1495, 36.1338),
      nightlyRateCents: dollarsToCents(246),
      stars: 4.6,
      freeCancellation: true,
      characteristics: ["conference_adjacent", "gym", "wifi"],
      listingUrl: HOTEL_URLS.hotel_hilton_vegas_near,
      url: HOTEL_URLS.hotel_hilton_vegas_near,
      ...HOTEL_DETAILS.hotel_hilton_vegas_near!,
    },
    {
      _id: "hotel_marriott_vegas_closest",
      name: "Renaissance Las Vegas Hotel",
      brand: "Marriott",
      city: "Las Vegas",
      // ~0.1 mi
      location: point(-115.1525, 36.1322),
      nightlyRateCents: dollarsToCents(268),
      stars: 4.7,
      freeCancellation: true,
      characteristics: ["closest", "business_center"],
      listingUrl: HOTEL_URLS.hotel_marriott_vegas_closest,
      url: HOTEL_URLS.hotel_marriott_vegas_closest,
      ...HOTEL_DETAILS.hotel_marriott_vegas_closest!,
    },
    {
      _id: "hotel_hyatt_vegas",
      name: "Hyatt Place Las Vegas",
      brand: "Hyatt",
      city: "Las Vegas",
      // ~0.9 mi
      location: point(-115.168, 36.138),
      nightlyRateCents: dollarsToCents(204),
      stars: 4.2,
      freeCancellation: true,
      characteristics: ["value"],
      listingUrl: HOTEL_URLS.hotel_hyatt_vegas,
      url: HOTEL_URLS.hotel_hyatt_vegas,
      ...HOTEL_DETAILS.hotel_hyatt_vegas!,
    },
    {
      _id: "hotel_westin_vegas",
      name: "The Westin Las Vegas Hotel & Spa",
      brand: "Westin",
      city: "Las Vegas",
      location: point(-115.17, 36.125),
      nightlyRateCents: dollarsToCents(229),
      stars: 4.3,
      freeCancellation: false,
      characteristics: ["spa"],
      listingUrl: HOTEL_URLS.hotel_westin_vegas,
      url: HOTEL_URLS.hotel_westin_vegas,
      ...HOTEL_DETAILS.hotel_westin_vegas!,
    },
    {
      _id: "hotel_hampton_vegas",
      name: "Hampton Inn Las Vegas Strip South",
      brand: "Hilton",
      city: "Las Vegas",
      location: point(-115.16, 36.14),
      nightlyRateCents: dollarsToCents(189),
      stars: 4.0,
      freeCancellation: true,
      characteristics: ["breakfast"],
      listingUrl: HOTEL_URLS.hotel_hampton_vegas,
      url: HOTEL_URLS.hotel_hampton_vegas,
      ...HOTEL_DETAILS.hotel_hampton_vegas!,
    },
  ];

  const ledger: CompanyBudgetLedger = {
    _id: LEDGER_ACME_ID,
    organizationId: ORG_ACME_ID,
    annualBudgetCents: dollarsToCents(100_000),
    spentCents: dollarsToCents(40_496),
    reservedCents: 0,
    availableCents: dollarsToCents(58_420), // 100000 - 40496 - residual rounding story
    updatedAt: new Date().toISOString(),
  };
  // Fix available to match spec: 58420
  ledger.availableCents = dollarsToCents(58_420);
  ledger.spentCents = ledger.annualBudgetCents - ledger.availableCents - ledger.reservedCents;

  // Past bookings for Alex + others (no Vegas upcoming — demo books that)
  const pastBookings: Booking[] = [];
  const pastExpenses: Expense[] = [];
  const feedbackDocs: Feedback[] = [];

  const pastTrips = [
    {
      id: "book_alex_nyc_1",
      emp: EMP_ALEX_ID,
      dest: "New York",
      purpose: "Customer visit",
      start: "2026-03-10",
      end: "2026-03-12",
      airline: "United",
      hotel: "Hilton Midtown",
      flight: 41200,
      hotelTotal: 98000,
      dist: 0.4,
      policy: "exception" as const,
    },
    {
      id: "book_alex_sf_conf",
      emp: EMP_ALEX_ID,
      dest: "San Francisco",
      purpose: "Internal summit",
      start: "2026-02-04",
      end: "2026-02-06",
      airline: "Alaska",
      hotel: "Hilton Union Square",
      flight: 0,
      hotelTotal: 88200,
      dist: 0.5,
      policy: "exception" as const,
    },
    {
      id: "book_alex_sea",
      emp: EMP_ALEX_ID,
      dest: "Seattle",
      purpose: "Team offsite",
      start: "2026-01-20",
      end: "2026-01-22",
      airline: "Alaska",
      hotel: "Marriott Waterfront",
      flight: 27800,
      hotelTotal: 54000,
      dist: 0.6,
      policy: "compliant" as const,
    },
    {
      id: "book_alex_chi",
      emp: EMP_ALEX_ID,
      dest: "Chicago",
      purpose: "Conference travel",
      start: "2025-11-12",
      end: "2025-11-14",
      airline: "United",
      hotel: "Hilton Chicago",
      flight: 35600,
      hotelTotal: 62000,
      dist: 0.3,
      policy: "compliant" as const,
    },
    {
      id: "book_alex_aus",
      emp: EMP_ALEX_ID,
      dest: "Austin",
      purpose: "Customer visit",
      start: "2025-10-08",
      end: "2025-10-10",
      airline: "United",
      hotel: "Hilton Austin",
      flight: 28900,
      hotelTotal: 49800,
      dist: 0.7,
      policy: "compliant" as const,
    },
    {
      id: "book_alex_lon",
      emp: EMP_ALEX_ID,
      dest: "London",
      purpose: "Partner summit",
      start: "2025-09-15",
      end: "2025-09-19",
      airline: "United",
      hotel: "Hilton London Metropole",
      flight: 89200,
      hotelTotal: 112000,
      dist: 0.8,
      policy: "exception" as const,
    },
    {
      id: "book_jordan_sf",
      emp: "emp_jordan",
      dest: "San Francisco",
      purpose: "Customer visit",
      start: "2026-04-02",
      end: "2026-04-04",
      airline: "JetBlue",
      hotel: "Marriott Marquis",
      flight: 44800,
      hotelTotal: 91000,
      dist: 0.4,
      policy: "exception" as const,
    },
    {
      id: "book_priya_nyc",
      emp: "emp_priya",
      dest: "New York",
      purpose: "Conference travel",
      start: "2026-03-18",
      end: "2026-03-20",
      airline: "American",
      hotel: "Hyatt Grand Central",
      flight: 38900,
      hotelTotal: 105000,
      dist: 0.2,
      policy: "exception" as const,
    },
    {
      id: "book_marcus_nyc",
      emp: "emp_marcus",
      dest: "New York",
      purpose: "Leadership offsite",
      start: "2026-02-24",
      end: "2026-02-26",
      airline: "Alaska",
      hotel: "Marriott Downtown",
      flight: 51200,
      hotelTotal: 99000,
      dist: 0.5,
      policy: "exception" as const,
    },
    {
      id: "book_marcus_chi",
      emp: "emp_marcus",
      dest: "Chicago",
      purpose: "Customer visit",
      start: "2025-12-03",
      end: "2025-12-05",
      airline: "United",
      hotel: "Hilton Garden Inn",
      flight: 30100,
      hotelTotal: 45600,
      dist: 0.9,
      policy: "compliant" as const,
    },
    {
      id: "book_jordan_sea",
      emp: "emp_jordan",
      dest: "Seattle",
      purpose: "Team offsite",
      start: "2025-11-05",
      end: "2025-11-07",
      airline: "Delta",
      hotel: "Marriott Seattle",
      flight: 33400,
      hotelTotal: 52000,
      dist: 0.6,
      policy: "compliant" as const,
    },
    {
      id: "book_priya_sf",
      emp: "emp_priya",
      dest: "San Francisco",
      purpose: "Conference travel",
      start: "2025-10-21",
      end: "2025-10-23",
      airline: "United",
      hotel: "Hilton Financial District",
      flight: 26800,
      hotelTotal: 87600,
      dist: 0.3,
      policy: "exception" as const,
    },
    {
      id: "book_alex_nyc_2",
      emp: EMP_ALEX_ID,
      dest: "New York",
      purpose: "Customer visit",
      start: "2025-08-19",
      end: "2025-08-21",
      airline: "United",
      hotel: "Hilton Garden Midtown",
      flight: 40100,
      hotelTotal: 94000,
      dist: 0.5,
      policy: "exception" as const,
    },
    {
      id: "book_jordan_aus",
      emp: "emp_jordan",
      dest: "Austin",
      purpose: "Customer visit",
      start: "2025-07-14",
      end: "2025-07-16",
      airline: "Delta",
      hotel: "Marriott Austin",
      flight: 31200,
      hotelTotal: 44000,
      dist: 0.8,
      policy: "compliant" as const,
    },
  ];

  for (const t of pastTrips) {
    const total = t.flight + t.hotelTotal;
    pastBookings.push({
      _id: t.id,
      bookingAttemptId: `attempt_${t.id}`,
      organizationId: ORG_ACME_ID,
      employeeId: t.emp,
      tripRequestId: `req_${t.id}`,
      candidateId: `cand_${t.id}`,
      state: "CONFIRMED",
      originCity:
        t.emp === EMP_ALEX_ID
          ? "San Francisco"
          : t.emp === "emp_jordan"
            ? "New York"
            : t.emp === "emp_priya"
              ? "Austin"
              : "Seattle",
      destinationCity: t.dest,
      purpose: t.purpose,
      startDate: t.start,
      endDate: t.end,
      flight: {
        id: `flt_${t.id}`,
        airline: t.airline,
        origin: "XXX",
        destination: "YYY",
        departTime: "09:00",
        arriveTime: "14:00",
        durationMinutes: 180,
        stops: 0,
        cabin: "economy",
        priceCents: t.flight,
        inventory: 0,
        confirmation: `CNF${t.id.slice(-4).toUpperCase()}`,
      },
      hotel: {
        name: t.hotel,
        brand: t.hotel.split(" ")[0]!,
        distanceMiles: t.dist,
        nightlyRateCents: Math.round(t.hotelTotal / 2),
        confirmation: `H${t.id.slice(-5).toUpperCase()}`,
      },
      flightCents: t.flight,
      hotelCents: t.hotelTotal,
      totalCents: total,
      policyStatus: t.policy,
      paymentLast4: "4242",
      testMode: true,
      createdAt: `${t.start}T12:00:00.000Z`,
      confirmedAt: `${t.start}T12:05:00.000Z`,
    });

    if (t.flight > 0) {
      pastExpenses.push({
        _id: `exp_air_${t.id}`,
        organizationId: ORG_ACME_ID,
        employeeId: t.emp,
        bookingId: t.id,
        category: "air_travel",
        vendor: t.airline,
        amountCents: t.flight,
        status: "automatically_classified",
        policyStatus: t.policy,
        paymentLabel: "Corporate Visa •••• 4242",
        reimbursementRequired: false,
        createdAt: `${t.start}T12:06:00.000Z`,
      });
    }
    pastExpenses.push({
      _id: `exp_hotel_${t.id}`,
      organizationId: ORG_ACME_ID,
      employeeId: t.emp,
      bookingId: t.id,
      category: "lodging",
      vendor: t.hotel,
      amountCents: t.hotelTotal,
      status: "automatically_classified",
      policyStatus: t.policy,
      paymentLabel: "Corporate Visa •••• 4242",
      reimbursementRequired: false,
      createdAt: `${t.start}T12:06:00.000Z`,
    });
  }

  // Feedback — SF/NYC hotel friction narrative
  const feedbackSeeds: Array<Omit<Feedback, "_id">> = [
    {
      organizationId: ORG_ACME_ID,
      employeeId: EMP_ALEX_ID,
      bookingId: "book_alex_sf_conf",
      flightStars: 5,
      hotelStars: 5,
      policyMadeHarder: true,
      frictionNote:
        "The hotel limit was too low to stay near the conference.",
      createdAt: "2026-02-07T00:00:00.000Z",
    },
    {
      organizationId: ORG_ACME_ID,
      employeeId: EMP_ALEX_ID,
      bookingId: "book_alex_nyc_1",
      flightStars: 4,
      hotelStars: 5,
      policyMadeHarder: true,
      frictionNote: "Needed exception for Midtown Hilton near client.",
      createdAt: "2026-03-13T00:00:00.000Z",
    },
    {
      organizationId: ORG_ACME_ID,
      employeeId: EMP_ALEX_ID,
      bookingId: "book_alex_sea",
      flightStars: 5,
      hotelStars: 4,
      policyMadeHarder: false,
      createdAt: "2026-01-23T00:00:00.000Z",
    },
    {
      organizationId: ORG_ACME_ID,
      employeeId: EMP_ALEX_ID,
      bookingId: "book_alex_chi",
      flightStars: 5,
      hotelStars: 5,
      policyMadeHarder: false,
      createdAt: "2025-11-15T00:00:00.000Z",
    },
    {
      organizationId: ORG_ACME_ID,
      employeeId: EMP_ALEX_ID,
      bookingId: "book_alex_aus",
      flightStars: 4,
      hotelStars: 5,
      policyMadeHarder: false,
      createdAt: "2025-10-11T00:00:00.000Z",
    },
    {
      organizationId: ORG_ACME_ID,
      employeeId: EMP_ALEX_ID,
      bookingId: "book_alex_lon",
      flightStars: 4,
      hotelStars: 4,
      policyMadeHarder: true,
      frictionNote: "International hotel rates exceed standard caps.",
      createdAt: "2025-09-20T00:00:00.000Z",
    },
    {
      organizationId: ORG_ACME_ID,
      employeeId: EMP_ALEX_ID,
      bookingId: "book_alex_nyc_2",
      flightStars: 5,
      hotelStars: 5,
      policyMadeHarder: true,
      frictionNote: "NYC hotel location forced an exception request.",
      createdAt: "2025-08-22T00:00:00.000Z",
    },
    {
      organizationId: ORG_ACME_ID,
      employeeId: "emp_jordan",
      bookingId: "book_jordan_sf",
      flightStars: 4,
      hotelStars: 4,
      policyMadeHarder: true,
      frictionNote: "San Francisco hotel cap blocked walking-distance options.",
      createdAt: "2026-04-05T00:00:00.000Z",
    },
    {
      organizationId: ORG_ACME_ID,
      employeeId: "emp_priya",
      bookingId: "book_priya_sf",
      flightStars: 3,
      hotelStars: 5,
      policyMadeHarder: true,
      frictionNote: "Had to request exception for Hilton near venue.",
      createdAt: "2025-10-24T00:00:00.000Z",
    },
  ];

  feedbackSeeds.forEach((f, i) => {
    feedbackDocs.push({ ...f, _id: `fb_${i + 1}` });
  });

  const suggestions: PolicySuggestion[] = [
    {
      _id: "sug_sf_hotel_cap",
      organizationId: ORG_ACME_ID,
      title: "Potential policy friction detected",
      topic: "San Francisco hotel cap",
      currentPolicy: "$250/night",
      tripsAnalyzed: 42,
      exceptionRequests: 19,
      employeesMentioned: 15,
      medianApprovedHotelCents: dollarsToCents(294),
      recommendation:
        "Consider increasing the San Francisco hotel allowance to $295/night during major conferences.",
      predictedImpact: [
        "43% fewer approval requests",
        "0.7 mi lower average commute",
        "+$31 average lodging cost",
      ],
      status: "open",
      createdAt: "2026-08-01T00:00:00.000Z",
    },
  ];

  await col<Organization>(db, "organizations").insertOne(org);
  await col<Employee>(db, "employees").insertMany(employees);
  await col<EmployeeProfile>(db, "employeeProfiles").insertMany(profiles);
  await col<TravelPolicy>(db, "travelPolicies").insertOne(policy);
  await col<Venue>(db, "venues").insertMany(venues);
  await col<Hotel>(db, "hotels").insertMany(hotels);
  await col<CompanyBudgetLedger>(db, "companyBudgetLedger").insertOne(ledger);
  await col<Booking>(db, "bookings").insertMany(pastBookings);
  await col<Expense>(db, "expenses").insertMany(pastExpenses);
  await col<Feedback>(db, "feedback").insertMany(feedbackDocs);
  await col<PolicySuggestion>(db, "policySuggestions").insertMany(suggestions);

  return { ok: true };
}
