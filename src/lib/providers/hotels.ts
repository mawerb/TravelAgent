import type { Db } from "mongodb";
import type { Hotel } from "@/types";
import { getHotelsWithCache } from "@/lib/inventory/cache";
import type { HotelNear } from "@/lib/geo";

export interface HotelProvider {
  searchHotels(input: {
    city: string;
    venueCoordinates?: [number, number];
    maxDistanceMeters?: number;
  }): Promise<HotelNear[] | Hotel[]>;
  bookHotel(hotelId: string): Promise<{ confirmation: string }>;
  cancelHotel(confirmation: string): Promise<void>;
}

export class MockHotelProvider implements HotelProvider {
  constructor(private db: Db) {}

  async searchHotels(input: {
    city: string;
    venueCoordinates?: [number, number];
    maxDistanceMeters?: number;
  }): Promise<HotelNear[] | Hotel[]> {
    const hit = await getHotelsWithCache(this.db, {
      city: input.city,
      venueCoordinates: input.venueCoordinates,
      maxMiles: input.maxDistanceMeters
        ? input.maxDistanceMeters / 1609.34
        : 5,
    });
    return hit.items;
  }

  async bookHotel(hotelId: string): Promise<{ confirmation: string }> {
    if (hotelId === "hotel_hilton_vegas_near") {
      return { confirmation: "HLT83291" };
    }
    return { confirmation: `HTL${hotelId.slice(-5).toUpperCase()}` };
  }

  async cancelHotel(_confirmation: string): Promise<void> {
    void _confirmation;
  }
}

export function getHotelProvider(db: Db): HotelProvider {
  return new MockHotelProvider(db);
}
