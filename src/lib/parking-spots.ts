import type { ParkingSpot } from "@/types/valet";

export function findParkingSpotByIdentifier(spots: ParkingSpot[], identifier?: string | null) {
  if (!identifier) {
    return undefined;
  }

  return spots.find((spot) => spot.id === identifier || spot.code === identifier);
}

export function getParkingSpotLabel(spots: ParkingSpot[], identifier?: string | null, fallback = "-") {
  if (!identifier) {
    return fallback;
  }

  return findParkingSpotByIdentifier(spots, identifier)?.code ?? identifier;
}
