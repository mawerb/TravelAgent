import type { FlightOffer, GeoPoint, Hotel, HotelRoom } from "@/types";
import { googleFlightsUrl, hotelListingUrl } from "@/lib/links";
import { dollarsToCents } from "@/lib/money";

/**
 * Demo "scraper": builds / refreshes inventory for a route or city.
 * Upgrade path: swap these for a real provider/scraper (Amadeus, Duffel, brand sites)
 * and keep the same MongoDB cache + 1-week TTL contract.
 */

const VEGAS_FLIGHTS: Omit<FlightOffer, "url">[] = [
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

function hashRoute(origin: string, destination: string): number {
  const s = `${origin}|${destination}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const AIRLINES = ["United", "Delta", "American", "Alaska"] as const;

/** Refresh flight inventory for a route (scrape/synthesize). */
export function scrapeFlights(input: {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
}): FlightOffer[] {
  const origin = input.origin.toUpperCase();
  const destination = input.destination.toUpperCase();

  if (origin === "SFO" && destination === "LAS") {
    return VEGAS_FLIGHTS.map((f) => ({
      ...f,
      url: googleFlightsUrl({
        origin: f.origin,
        destination: f.destination,
        date: input.date,
        returnDate: input.returnDate,
        airline: f.airline,
      }),
    }));
  }

  const h = hashRoute(origin, destination);
  const basePrice = 180 + (h % 220);
  const duration = 90 + (h % 180);

  return AIRLINES.slice(0, 3 + (h % 2)).map((airline, i) => {
    const departHour = 7 + i * 3 + (h % 2);
    const departMin = (h + i * 17) % 60;
    const arriveTotal = departHour * 60 + departMin + duration;
    const price = basePrice + i * 35 + (airline === "United" ? 20 : 0);
    const id = `flt_${airline.slice(0, 2).toLowerCase()}_${origin}_${destination}_${i}`.toLowerCase();
    const offer: FlightOffer = {
      id,
      airline,
      origin,
      destination,
      departTime: `${String(departHour).padStart(2, "0")}:${String(departMin).padStart(2, "0")}`,
      arriveTime: `${String(Math.floor(arriveTotal / 60) % 24).padStart(2, "0")}:${String(arriveTotal % 60).padStart(2, "0")}`,
      durationMinutes: duration,
      stops: i === 2 ? 1 : 0,
      cabin: "economy",
      priceCents: dollarsToCents(price),
      inventory: 4 + (h % 5),
      url: googleFlightsUrl({
        origin,
        destination,
        date: input.date,
        returnDate: input.returnDate,
        airline,
      }),
    };
    return offer;
  });
}

type CityMeta = {
  city: string;
  center: GeoPoint;
  hotels: Array<{
    brand: string;
    name: string;
    nightly: number;
    stars: number;
    offset: [number, number];
    amenities: string[];
    room: HotelRoom;
  }>;
};

const CITY_HOTELS: Record<string, CityMeta> = {
  "las vegas": {
    city: "Las Vegas",
    center: { type: "Point", coordinates: [-115.1537, 36.1315] },
    hotels: [], // seeded separately; scrape fills if empty
  },
  seattle: {
    city: "Seattle",
    center: { type: "Point", coordinates: [-122.3321, 47.6062] },
    hotels: [
      {
        brand: "Hilton",
        name: "Hilton Seattle",
        nightly: 229,
        stars: 4.3,
        offset: [0.01, 0.008],
        amenities: ["Free Wi‑Fi", "Fitness center", "Restaurant"],
        room: {
          name: "King Guest Room",
          bedType: "1 King bed",
          sleeps: 2,
          refundable: true,
          breakfastIncluded: false,
          description: "Downtown king room within walking distance of the convention center.",
        },
      },
      {
        brand: "Marriott",
        name: "Seattle Marriott Waterfront",
        nightly: 259,
        stars: 4.5,
        offset: [-0.012, 0.004],
        amenities: ["Free Wi‑Fi", "Waterfront views", "Fitness center"],
        room: {
          name: "Deluxe King",
          bedType: "1 King bed",
          sleeps: 2,
          refundable: true,
          breakfastIncluded: false,
        },
      },
      {
        brand: "Hyatt",
        name: "Hyatt Regency Seattle",
        nightly: 214,
        stars: 4.4,
        offset: [0.006, -0.01],
        amenities: ["Free Wi‑Fi", "Pool", "Business center"],
        room: {
          name: "King Room",
          bedType: "1 King bed",
          sleeps: 2,
          refundable: true,
          breakfastIncluded: true,
        },
      },
    ],
  },
  "new york": {
    city: "New York",
    center: { type: "Point", coordinates: [-73.9857, 40.7484] },
    hotels: [
      {
        brand: "Hilton",
        name: "Hilton Midtown",
        nightly: 289,
        stars: 4.2,
        offset: [0.008, 0.006],
        amenities: ["Free Wi‑Fi", "Fitness center", "Restaurant"],
        room: {
          name: "King Guestroom",
          bedType: "1 King bed",
          sleeps: 2,
          refundable: true,
          breakfastIncluded: false,
        },
      },
      {
        brand: "Marriott",
        name: "New York Marriott Marquis",
        nightly: 319,
        stars: 4.4,
        offset: [-0.005, 0.009],
        amenities: ["Free Wi‑Fi", "Sky lobby", "Fitness center"],
        room: {
          name: "Deluxe King",
          bedType: "1 King bed",
          sleeps: 2,
          refundable: true,
          breakfastIncluded: false,
        },
      },
    ],
  },
  chicago: {
    city: "Chicago",
    center: { type: "Point", coordinates: [-87.6298, 41.8781] },
    hotels: [
      {
        brand: "Hilton",
        name: "Hilton Chicago",
        nightly: 239,
        stars: 4.3,
        offset: [0.01, -0.006],
        amenities: ["Free Wi‑Fi", "Lake views", "Fitness center"],
        room: {
          name: "King Room",
          bedType: "1 King bed",
          sleeps: 2,
          refundable: true,
          breakfastIncluded: false,
        },
      },
      {
        brand: "Hyatt",
        name: "Hyatt Regency Chicago",
        nightly: 224,
        stars: 4.2,
        offset: [-0.008, 0.007],
        amenities: ["Free Wi‑Fi", "Riverwalk access", "Restaurant"],
        room: {
          name: "King Guestroom",
          bedType: "1 King bed",
          sleeps: 2,
          refundable: true,
          breakfastIncluded: true,
        },
      },
    ],
  },
  austin: {
    city: "Austin",
    center: { type: "Point", coordinates: [-97.7431, 30.2672] },
    hotels: [
      {
        brand: "Hilton",
        name: "Hilton Austin",
        nightly: 209,
        stars: 4.3,
        offset: [0.009, 0.005],
        amenities: ["Free Wi‑Fi", "Pool", "Fitness center"],
        room: {
          name: "King Guest Room",
          bedType: "1 King bed",
          sleeps: 2,
          refundable: true,
          breakfastIncluded: false,
        },
      },
      {
        brand: "Marriott",
        name: "Austin Marriott Downtown",
        nightly: 219,
        stars: 4.4,
        offset: [-0.007, 0.008],
        amenities: ["Free Wi‑Fi", "Rooftop bar", "Fitness center"],
        room: {
          name: "Deluxe King",
          bedType: "1 King bed",
          sleeps: 2,
          refundable: true,
          breakfastIncluded: false,
        },
      },
    ],
  },
};

function slugCity(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

/** Refresh hotel inventory for a city (scrape/synthesize into Hotel docs). */
export function scrapeHotels(city: string, fetchedAt: string): Hotel[] {
  const key = city.trim().toLowerCase();
  const meta = CITY_HOTELS[key];
  // Seeded cities (e.g. Las Vegas) leave hotels[] empty — cache only refreshes TTL.
  if (meta && meta.hotels.length === 0) return [];
  if (!meta) {
    // Generic fallback so unknown cities still get bookable inventory
    const center: GeoPoint = {
      type: "Point",
      coordinates: [-122.4194, 37.7749],
    };
    const label = city.trim();
    return ["Hilton", "Marriott", "Hyatt"].map((brand, i) => {
      const id = `hotel_${slugCity(label)}_${brand.toLowerCase()}_${i}`;
      const room: HotelRoom = {
        name: "King Guest Room",
        bedType: "1 King bed",
        sleeps: 2,
        refundable: true,
        breakfastIncluded: brand === "Hyatt",
      };
      return {
        _id: id,
        name: `${brand} ${label}`,
        brand,
        city: label,
        location: {
          type: "Point",
          coordinates: [
            center.coordinates[0] + i * 0.008,
            center.coordinates[1] + i * 0.005,
          ],
        },
        nightlyRateCents: dollarsToCents(189 + i * 30),
        stars: 4.1 + i * 0.1,
        freeCancellation: true,
        characteristics: ["wifi"],
        amenities: ["Free Wi‑Fi", "Fitness center"],
        address: `${100 + i} Main St, ${label}`,
        neighborhood: "Downtown",
        room,
        listingUrl: hotelListingUrl({ hotelId: id, name: `${brand} ${label}`, city: label }),
        url: hotelListingUrl({ hotelId: id, name: `${brand} ${label}`, city: label }),
        fetchedAt,
      } satisfies Hotel;
    });
  }

  const [lng, lat] = meta.center.coordinates;
  return meta.hotels.map((h, i) => {
    const id = `hotel_${slugCity(meta.city)}_${h.brand.toLowerCase()}_${i}`;
    return {
      _id: id,
      name: h.name,
      brand: h.brand,
      city: meta.city,
      location: {
        type: "Point",
        coordinates: [lng + h.offset[0], lat + h.offset[1]],
      },
      nightlyRateCents: dollarsToCents(h.nightly),
      stars: h.stars,
      freeCancellation: true,
      characteristics: ["wifi"],
      amenities: h.amenities,
      address: `${200 + i * 10} Pike St, ${meta.city}`,
      neighborhood: "Downtown",
      room: h.room,
      listingUrl: hotelListingUrl({ hotelId: id, name: h.name, city: meta.city }),
      url: hotelListingUrl({ hotelId: id, name: h.name, city: meta.city }),
      fetchedAt,
    } satisfies Hotel;
  });
}
