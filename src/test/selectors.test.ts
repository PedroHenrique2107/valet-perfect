import { describe, expect, it } from "vitest";
import { filterAttendants, filterVehicles } from "@/lib/selectors";
import type { Attendant, Vehicle } from "@/types/valet";

const vehiclesFixture: Vehicle[] = [
  {
    id: "v1",
    plate: "XYZ-5678",
    brand: "Toyota",
    model: "Corolla",
    color: "Prata",
    year: 2024,
    status: "requested",
    entryTime: new Date("2026-03-17T12:00:00Z"),
    spotId: "A-01",
    attendantId: "a1",
    clientName: "Pedro",
    clientPhone: "11999999999",
  },
];

const attendantsFixture: Attendant[] = [
  {
    id: "a1",
    name: "Rafael Santos",
    photo: "",
    status: "online",
    phone: "11999999999",
    vehiclesHandled: 0,
    vehiclesHandledToday: 0,
    avgServiceTime: 0,
    rating: 5,
    shift: "afternoon",
    isOnline: true,
    parkingId: "p1",
    parkingName: "Unidade A",
    workPeriodStart: "13:00",
    workPeriodEnd: "22:00",
    maxWorkHours: 8,
    accumulatedWorkMinutes: 0,
  },
];

describe("selectors", () => {
  it("filters vehicles by search and status", () => {
    const result = filterVehicles(vehiclesFixture, "XYZ", "requested");
    expect(result).toHaveLength(1);
    expect(result[0].plate).toBe("XYZ-5678");
  });

  it("filters attendants by shift and name", () => {
    const result = filterAttendants(attendantsFixture, "Rafael", "afternoon");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Rafael Santos");
  });
});
