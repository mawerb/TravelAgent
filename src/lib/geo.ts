import type { Db } from "mongodb";
import type { GeoPoint, Hotel } from "@/types";
import { col } from "@/lib/db/collections";

const METERS_PER_MILE = 1609.344;

export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE;
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function formatMiles(miles: number): string {
  const rounded = Math.round(miles * 10) / 10;
  return `${rounded} mi`;
}

/** Haversine distance in miles — used when $near distance metadata is unavailable. */
export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = a.coordinates;
  const [lng2, lat2] = b.coordinates;
  const R = 3958.7613;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export type HotelNear = Hotel & { distanceMiles: number };

export async function findHotelsNear(
  db: Db,
  opts: {
    coordinates: [number, number];
    maxDistanceMeters: number;
    limit?: number;
  },
): Promise<HotelNear[]> {
  const venuePoint: GeoPoint = {
    type: "Point",
    coordinates: opts.coordinates,
  };

  const docs = await col<Hotel>(db, "hotels")
    .find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: opts.coordinates,
          },
          $maxDistance: opts.maxDistanceMeters,
        },
      },
    })
    .limit(opts.limit ?? 50)
    .toArray();

  return docs.map((hotel) => ({
    ...hotel,
    distanceMiles: haversineMiles(venuePoint, hotel.location),
  }));
}
