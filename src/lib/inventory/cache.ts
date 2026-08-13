import type { Db } from "mongodb";
import type { FlightOffer, FlightRouteInventory, Hotel } from "@/types";
import { col } from "@/lib/db/collections";
import { scrapeFlights, scrapeHotels } from "@/lib/inventory/scrape";
import {
  inventoryAgeLabel,
  isInventoryStale,
} from "@/lib/inventory/ttl";
import { googleFlightsUrl } from "@/lib/links";
import { findHotelsNear, milesToMeters, type HotelNear } from "@/lib/geo";
import { hasDuffelToken, searchDuffelFlights } from "@/lib/providers/duffel";

export type InventoryHit<T> = {
  items: T[];
  fromCache: boolean;
  refreshed: boolean;
  detail: string;
};

function flightCacheId(
  origin: string,
  destination: string,
  date: string,
  returnDate?: string,
): string {
  return `route_${origin}_${destination}_${date}_${returnDate ?? "ow"}`;
}

/**
 * MongoDB-first flights: use cache if fresh (<1 week), otherwise Duffel (or demo scrape).
 */
export async function getFlightsWithCache(
  db: Db,
  input: {
    origin: string;
    destination: string;
    date: string;
    returnDate?: string;
  },
): Promise<InventoryHit<FlightOffer>> {
  const origin = input.origin.toUpperCase();
  const destination = input.destination.toUpperCase();
  const id = flightCacheId(origin, destination, input.date, input.returnDate);
  const cached = await col<FlightRouteInventory>(db, "flightInventory").findOne({
    _id: id,
  });

  if (cached && !isInventoryStale(cached.fetchedAt) && cached.offers.length > 0) {
    const offers = cached.offers.map((f) => ({
      ...f,
      url: googleFlightsUrl({
        origin: f.origin,
        destination: f.destination,
        date: input.date,
        returnDate: input.returnDate,
        airline: f.airline,
      }),
    }));
    return {
      items: offers,
      fromCache: true,
      refreshed: false,
      detail: `${offers.length} flights from MongoDB cache (${inventoryAgeLabel(cached.fetchedAt)}${cached.source === "duffel" ? ", Duffel" : ""})`,
    };
  }

  const fetchedAt = new Date().toISOString();
  let offers: FlightOffer[] = [];
  let source: FlightRouteInventory["source"] = "scrape";
  let providerNote = "demo scrape";

  if (hasDuffelToken()) {
    try {
      offers = await searchDuffelFlights(input);
      if (offers.length > 0) {
        source = "duffel";
        providerNote = "Duffel";
      } else {
        providerNote = "Duffel empty — demo scrape";
        offers = scrapeFlights(input);
      }
    } catch (err) {
      console.error("[duffel] flight search failed, using demo scrape", err);
      providerNote = "Duffel error — demo scrape";
      offers = scrapeFlights(input);
    }
  } else {
    offers = scrapeFlights(input);
  }

  const doc: FlightRouteInventory = {
    _id: id,
    origin,
    destination,
    date: input.date,
    returnDate: input.returnDate,
    offers,
    fetchedAt,
    source,
  };
  await col<FlightRouteInventory>(db, "flightInventory").updateOne(
    { _id: id },
    { $set: doc },
    { upsert: true },
  );

  const reason = cached
    ? `stale cache refreshed via ${providerNote} (${inventoryAgeLabel(cached.fetchedAt)})`
    : `no cache — ${providerNote}`;
  return {
    items: offers,
    fromCache: false,
    refreshed: true,
    detail: `${offers.length} flights ${reason} into MongoDB`,
  };
}

/**
 * MongoDB-first hotels: city (or near venue) if fresh; otherwise scrape / refresh TTL.
 * (Duffel Stays not enabled on current token — keep demo hotel inventory.)
 */
export async function getHotelsWithCache(
  db: Db,
  input: {
    city: string;
    venueCoordinates?: [number, number];
    maxMiles?: number;
  },
): Promise<InventoryHit<Hotel | HotelNear>> {
  const city = input.city.trim();
  const cityRe = new RegExp(`^${escapeRegex(city)}$`, "i");

  if (input.venueCoordinates) {
    const near = await findHotelsNear(db, {
      coordinates: input.venueCoordinates,
      maxDistanceMeters: milesToMeters(input.maxMiles ?? 5),
      limit: 50,
    });
    const fresh = near.filter((h) => !isInventoryStale((h as Hotel).fetchedAt));
    if (fresh.length > 0) {
      const sample = (fresh[0] as Hotel).fetchedAt!;
      return {
        items: fresh,
        fromCache: true,
        refreshed: false,
        detail: `${fresh.length} hotels near venue from MongoDB (${inventoryAgeLabel(sample)})`,
      };
    }
  }

  const existing = await col<Hotel>(db, "hotels")
    .find({ city: { $regex: cityRe } })
    .limit(50)
    .toArray();

  const fresh = existing.filter((h) => !isInventoryStale(h.fetchedAt));
  if (fresh.length > 0) {
    return {
      items: fresh,
      fromCache: true,
      refreshed: false,
      detail: `${fresh.length} hotels in ${city} from MongoDB (${inventoryAgeLabel(fresh[0]!.fetchedAt!)})`,
    };
  }

  const fetchedAt = new Date().toISOString();
  const scraped = scrapeHotels(city, fetchedAt);
  for (const hotel of scraped) {
    await col<Hotel>(db, "hotels").updateOne(
      { _id: hotel._id },
      { $set: hotel },
      { upsert: true },
    );
  }

  if (existing.length > 0 || scraped.length > 0) {
    await col<Hotel>(db, "hotels").updateMany(
      { city: { $regex: cityRe } },
      { $set: { fetchedAt } },
    );
  }

  const items = await col<Hotel>(db, "hotels")
    .find({ city: { $regex: cityRe } })
    .limit(50)
    .toArray();

  const result = items.length > 0 ? items : scraped;
  const reason =
    existing.length > 0
      ? `stale ${city} inventory refreshed`
      : `no ${city} inventory — scraped`;

  return {
    items: result,
    fromCache: false,
    refreshed: true,
    detail: `${result.length} hotels ${reason} into MongoDB`,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
