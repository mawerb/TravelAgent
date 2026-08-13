"use client";

import { useState } from "react";
import { updateProfileAction } from "@/app/actions/policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileEditor({
  initial,
}: {
  initial: {
    homeAirport: string;
    preferredAirlines: string[];
    seat: "aisle" | "window" | "middle";
    preferredHotelBrands: string[];
  };
}) {
  const [homeAirport, setHomeAirport] = useState(initial.homeAirport);
  const [airlines, setAirlines] = useState(initial.preferredAirlines.join(", "));
  const [seat, setSeat] = useState(initial.seat);
  const [hotels, setHotels] = useState(initial.preferredHotelBrands.join(", "));
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-white p-5">
      <h3 className="font-semibold">Edit preferences</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Home airport</Label>
          <Input value={homeAirport} onChange={(e) => setHomeAirport(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Seat</Label>
          <select
            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm"
            value={seat}
            onChange={(e) =>
              setSeat(e.target.value as "aisle" | "window" | "middle")
            }
          >
            <option value="aisle">Aisle</option>
            <option value="window">Window</option>
            <option value="middle">Middle</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Preferred airlines</Label>
          <Input value={airlines} onChange={(e) => setAirlines(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Preferred hotel brands</Label>
          <Input value={hotels} onChange={(e) => setHotels(e.target.value)} />
        </div>
      </div>
      <Button
        onClick={async () => {
          await updateProfileAction({
            homeAirport,
            preferredAirlines: airlines.split(",").map((s) => s.trim()).filter(Boolean),
            seat,
            preferredHotelBrands: hotels.split(",").map((s) => s.trim()).filter(Boolean),
          });
          setSaved(true);
        }}
      >
        Save preferences
      </Button>
      {saved ? (
        <p className="text-sm text-emerald-700">Preferences saved.</p>
      ) : null}
    </div>
  );
}
