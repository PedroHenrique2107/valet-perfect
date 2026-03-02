import { DEFAULT_UNIT_NAME } from "@/config/pricing";

export interface ParkingOption {
  id: string;
  name: string;
}

export const PARKING_OPTIONS: ParkingOption[] = [
  { id: "scn", name: DEFAULT_UNIT_NAME },
];

export function getParkingById(id: string): ParkingOption {
  return PARKING_OPTIONS.find((parking) => parking.id === id) ?? PARKING_OPTIONS[0];
}
