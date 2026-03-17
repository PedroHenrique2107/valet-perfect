import { supabase } from "@/integrations/supabase/client";
import type { Activity, Attendant, DashboardStats, OccupancyData, ParkingSpot, RevenueData } from "@/types/valet";
import { addClientVehicle, chargeClient, createClient, listClients, updateClient } from "@/services/clients.service";
import {
  EMPTY_DASHBOARD_STATS,
  ensureSupabaseConfigured,
  isSupabaseConfigured,
  toActivity,
  toAttendant,
  toOccupancyData,
  toParkingSpot,
  toRevenueData,
} from "@/services/service-utils";
import {
  createVehicleStay,
  listVehicleStays,
  moveVehicleToSpot,
  registerVehicleExit,
  requestVehiclePickup,
} from "@/services/stays.service";
import { listTransactions } from "@/services/transactions.service";
import type {
  AddClientVehicleInput,
  AssignTaskInput,
  ChargeClientInput,
  CreateAttendantInput,
  CreateClientInput,
  CreateParkingFloorInput,
  CreateParkingSpotInput,
  CreateVehicleInput,
  MoveParkingSpotInput,
  RegisterExitInput,
  UpdateClientInput,
  UpdateParkingSpotConfigInput,
  UpdateVehicleSpotInput,
} from "@/services/valet.types";

export type {
  AddClientVehicleInput,
  AssignTaskInput,
  ChargeClientInput,
  CreateAttendantInput,
  CreateClientInput,
  CreateParkingFloorInput,
  CreateParkingSpotInput,
  CreateVehicleInput,
  MoveParkingSpotInput,
  RegisterExitInput,
  UpdateClientInput,
  UpdateParkingSpotConfigInput,
  UpdateVehicleSpotInput,
} from "@/services/valet.types";

async function listAttendants(): Promise<Attendant[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase.from("attendants_view").select("*").order("full_name", { ascending: true });
  if (error) {
    return [];
  }

  return (data ?? []).map(toAttendant);
}

async function listParkingSpots(): Promise<ParkingSpot[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("parking_spots")
      .select("*")
      .order("floor", { ascending: true })
      .order("section", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      return [];
    }

    return (data ?? []).map(toParkingSpot);
  } catch {
    return [];
  }
}

async function listRevenueData(): Promise<RevenueData[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase.from("revenue_daily_view").select("*").order("date", { ascending: true });
  if (error) {
    return [];
  }

  return (data ?? []).map(toRevenueData);
}

async function listOccupancyData(): Promise<OccupancyData[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase.from("occupancy_hourly_view").select("*").order("hour", { ascending: true });
  if (error) {
    return [];
  }

  return (data ?? []).map(toOccupancyData);
}

async function getDashboardStats(): Promise<DashboardStats> {
  if (!isSupabaseConfigured()) {
    return EMPTY_DASHBOARD_STATS;
  }

  const { data, error } = await supabase.from("dashboard_stats_view").select("*").maybeSingle();
  if (error || !data) {
    return EMPTY_DASHBOARD_STATS;
  }

  return {
    totalVehicles: Number(data.totalVehicles ?? data.total_vehicles ?? 0),
    availableSpots: Number(data.availableSpots ?? data.available_spots ?? 0),
    occupancyRate: Number(data.occupancyRate ?? data.occupancy_rate ?? 0),
    todayRevenue: Number(data.todayRevenue ?? data.today_revenue ?? 0),
    avgStayDuration: Number(data.avgStayDuration ?? data.avg_stay_duration ?? 0),
    activeAttendants: Number(data.activeAttendants ?? data.active_attendants ?? 0),
    vehiclesWaiting: Number(data.vehiclesWaiting ?? data.vehicles_waiting ?? 0),
    avgWaitTime: Number(data.avgWaitTime ?? data.avg_wait_time ?? 0),
  };
}

async function listActivities(): Promise<Activity[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase.from("activity_feed_view").select("*").limit(20);
  if (error) {
    return [];
  }

  return (data ?? []).map(toActivity);
}

async function createAttendant(input: CreateAttendantInput): Promise<Attendant> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("invite_attendant_to_unit", {
    p_name: input.name,
    p_phone: input.phone,
    p_work_period_start: input.workPeriodStart,
    p_work_period_end: input.workPeriodEnd,
    p_max_work_hours: input.maxWorkHours,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toAttendant(data);
}

async function assignTask(input: AssignTaskInput): Promise<Attendant> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("assign_vehicle_task", {
    p_attendant_id: input.attendantId,
    p_stay_id: input.vehicleId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toAttendant(data);
}

async function updateParkingSpot(input: UpdateParkingSpotConfigInput): Promise<ParkingSpot> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("upsert_parking_spot", {
    p_id: input.spotId,
    p_code: input.code,
    p_floor: input.floor,
    p_section: input.section,
    p_type: input.type,
    p_status: input.status,
    p_observations: input.observations ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toParkingSpot(data);
}

async function createParkingSpot(input: CreateParkingSpotInput): Promise<ParkingSpot> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("upsert_parking_spot", {
    p_id: null,
    p_code: input.code,
    p_floor: input.floor,
    p_section: input.section,
    p_type: input.type,
    p_status: input.status,
    p_observations: input.observations ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toParkingSpot(data);
}

async function createParkingFloor(input: CreateParkingFloorInput) {
  ensureSupabaseConfigured();
  const { error } = await supabase.rpc("create_parking_floor", {
    p_floor: input.floor,
    p_total_spots: input.totalSpots,
    p_spot_categories: input.spotCategories,
    p_section_layout: input.sectionLayout,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { floor: input.floor };
}

async function deleteParkingFloor(floor: number) {
  ensureSupabaseConfigured();
  const { error } = await supabase.rpc("delete_parking_floor", { p_floor: floor });
  if (error) {
    throw new Error(error.message);
  }

  return { floor };
}

async function deleteParkingSpot(spotId: string) {
  ensureSupabaseConfigured();
  const { error } = await supabase.from("parking_spots").delete().eq("id", spotId);
  if (error) {
    throw new Error(error.message);
  }

  return { spotId };
}

async function moveParkingSpot(input: MoveParkingSpotInput): Promise<ParkingSpot> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("move_parking_spot", {
    p_spot_id: input.spotId,
    p_floor: input.floor,
    p_section: input.section,
    p_sort_order: input.sortOrder ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toParkingSpot(data);
}

export const valetApi = {
  getVehicles: listVehicleStays,
  getAttendants: listAttendants,
  getParkingSpots: listParkingSpots,
  getTransactions: listTransactions,
  getRevenueData: listRevenueData,
  getOccupancyData: listOccupancyData,
  getDashboardStats,
  getActivities: listActivities,
  getClients: listClients,
  createVehicle: (input: CreateVehicleInput) => createVehicleStay(input),
  requestVehicle: (vehicleId: string) => requestVehiclePickup(vehicleId),
  registerVehicleExit: (input: RegisterExitInput) => registerVehicleExit(input),
  assignTask: (input: AssignTaskInput) => assignTask(input),
  createClient: (input: CreateClientInput) => createClient(input),
  updateClient: (input: UpdateClientInput) => updateClient(input),
  addClientVehicle: (input: AddClientVehicleInput) => addClientVehicle(input),
  chargeClient: (input: ChargeClientInput) => chargeClient(input),
  createAttendant: (input: CreateAttendantInput) => createAttendant(input),
  updateVehicleSpot: (input: UpdateVehicleSpotInput) => moveVehicleToSpot(input),
  createParkingSpot: (input: CreateParkingSpotInput) => createParkingSpot(input),
  updateParkingSpotConfig: (input: UpdateParkingSpotConfigInput) => updateParkingSpot(input),
  createParkingFloor: (input: CreateParkingFloorInput) => createParkingFloor(input),
  deleteParkingFloor: (floor: number) => deleteParkingFloor(floor),
  deleteParkingSpot: (spotId: string) => deleteParkingSpot(spotId),
  moveParkingSpot: (input: MoveParkingSpotInput) => moveParkingSpot(input),
};
