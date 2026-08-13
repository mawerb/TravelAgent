import type { HotelRoom } from "@/types";

/** Demo hotel enrichment — patched onto Atlas docs that predate these fields. */
export const HOTEL_DETAILS: Record<
  string,
  {
    address: string;
    neighborhood: string;
    amenities: string[];
    room: HotelRoom;
  }
> = {
  hotel_hilton_vegas_near: {
    address: "80 E Harmon Ave, Las Vegas, NV 89109",
    neighborhood: "Center Strip · near Convention Center",
    amenities: [
      "Free Wi‑Fi",
      "Fitness center",
      "Outdoor pool",
      "Full kitchenette",
      "24-hour front desk",
      "Parking (paid)",
      "Pet-friendly (fee)",
    ],
    room: {
      name: "King Studio Suite",
      bedType: "1 King bed",
      sleeps: 2,
      refundable: true,
      breakfastIncluded: false,
      description:
        "Studio suite with kitchenette and separate living area — policy-friendly king room for conference travel.",
    },
  },
  hotel_marriott_vegas_closest: {
    address: "3400 Paradise Rd, Las Vegas, NV 89169",
    neighborhood: "Convention Center · 0.1 mi walk",
    amenities: [
      "Free Wi‑Fi",
      "Fitness center",
      "Business center",
      "On-site restaurant",
      "Room service",
      "Parking (paid)",
      "EV charging",
    ],
    room: {
      name: "Deluxe King Room",
      bedType: "1 King bed",
      sleeps: 2,
      refundable: true,
      breakfastIncluded: false,
      description:
        "Quiet deluxe king closest to the MongoDB.local venue — strong pick when proximity is the priority.",
    },
  },
  hotel_hyatt_vegas: {
    address: "4520 Paradise Rd, Las Vegas, NV 89169",
    neighborhood: "Paradise · value stay",
    amenities: [
      "Free Wi‑Fi",
      "Free breakfast",
      "Fitness center",
      "Outdoor pool",
      "24-hour front desk",
      "Parking (paid)",
    ],
    room: {
      name: "King Guestroom",
      bedType: "1 King bed",
      sleeps: 2,
      refundable: true,
      breakfastIncluded: true,
      description:
        "Standard king with free breakfast — lowest-cost in-policy option near the venue.",
    },
  },
  hotel_westin_vegas: {
    address: "160 E Flamingo Rd, Las Vegas, NV 89109",
    neighborhood: "Strip / Flamingo",
    amenities: [
      "Free Wi‑Fi",
      "Full-service spa",
      "Fitness center",
      "Pool",
      "On-site dining",
      "Parking (paid)",
    ],
    room: {
      name: "Heavenly King Room",
      bedType: "1 King bed",
      sleeps: 2,
      refundable: false,
      breakfastIncluded: false,
      description:
        "Heavenly Bed king room — note: non-refundable rate in this demo quote.",
    },
  },
  hotel_hampton_vegas: {
    address: "3315 Dean Martin Dr, Las Vegas, NV 89102",
    neighborhood: "South Strip",
    amenities: [
      "Free Wi‑Fi",
      "Free hot breakfast",
      "Fitness center",
      "Outdoor pool",
      "24-hour front desk",
      "Free parking",
    ],
    room: {
      name: "King Studio",
      bedType: "1 King bed",
      sleeps: 2,
      refundable: true,
      breakfastIncluded: true,
      description:
        "Hampton king studio with free breakfast and free parking.",
    },
  },
};
