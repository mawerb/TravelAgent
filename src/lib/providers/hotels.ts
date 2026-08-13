import type { Db } from "mongodb";
import type { Hotel } from "@/types";
import { col } from "@/lib/db/collections";
import { findHotelsNear, milesToMeters, type HotelNear } from "@/lib/geo";

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
    if (input.venueCoordinates) {
      return findHotelsNear(this.db, {
        coordinates: input.venueCoordinates,
        maxDistanceMeters: input.maxDistanceMeters ?? milesToMeters(5),
        limit: 50,
      });
    }
    return col<Hotel>(this.db, "hotels")
      .find({ city: input.city })
      .limit(50)
      .toArray();
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
