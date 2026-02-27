import type { Attendant, Vehicle, VehicleStatus } from "@/types/valet";

export function filterVehicles(
  vehicles: Vehicle[],
  searchQuery: string,
  statusFilter: VehicleStatus | "all",
): Vehicle[] {
  const normalized = searchQuery.trim().toLowerCase();

  return vehicles.filter((vehicle) => {
    const matchesSearch =
      normalized.length === 0 ||
      vehicle.plate.toLowerCase().includes(normalized) ||
      vehicle.clientName.toLowerCase().includes(normalized) ||
      vehicle.brand.toLowerCase().includes(normalized) ||
      vehicle.model.toLowerCase().includes(normalized);
    const matchesStatus =
      statusFilter === "all" ||
      vehicle.status === statusFilter ||
      (statusFilter === "requested" && vehicle.status === "in_transit");
    return matchesSearch && matchesStatus;
  });
}

export function filterAttendants(attendants: Attendant[], searchQuery: string, shiftFilter: string): Attendant[] {
  const normalized = searchQuery.trim().toLowerCase();
  return attendants.filter((attendant) => {
    const matchesSearch =
      normalized.length === 0 || attendant.name.toLowerCase().includes(normalized);
    const matchesShift = shiftFilter === "all" || attendant.shift === shiftFilter;
    return matchesSearch && matchesShift;
  });
}
