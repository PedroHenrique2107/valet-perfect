import { supabase } from "@/integrations/supabase/client";
import type { Activity, Attendant, CashSession, DashboardStats, OccupancyData, ParkingSpot, RevenueData } from "@/types/valet";
import type { ManagedUserCreationResult, PurgeResult, Unit, UnitInvitation, UnitMember } from "@/types/management";
import { addClientVehicle, chargeClient, createClient, listClients, updateClient } from "@/services/clients.service";
import {
  EMPTY_DASHBOARD_STATS,
  ensureSupabaseConfigured,
  isSupabaseConfigured,
  toCashSession,
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
  CreateManagedUserInput,
  CreateParkingFloorInput,
  CreateParkingSpotInput,
  CreateVehicleInput,
  CreateUnitInput,
  CreateUnitInvitationInput,
  MoveParkingSpotInput,
  OpenCashSessionInput,
  PurgeUnitDataInput,
  RegisterExitInput,
  RemoveUnitMemberInput,
  CloseCashSessionInput,
  UpdateClientInput,
  UpdateMyProfileInput,
  UpdateParkingSpotConfigInput,
  UpdateUnitMemberRoleInput,
  UpdateVehicleSpotInput,
} from "@/services/valet.types";

export type {
  AddClientVehicleInput,
  AssignTaskInput,
  ChargeClientInput,
  CreateAttendantInput,
  CreateClientInput,
  CreateManagedUserInput,
  CreateParkingFloorInput,
  CreateParkingSpotInput,
  CreateVehicleInput,
  CreateUnitInput,
  CreateUnitInvitationInput,
  MoveParkingSpotInput,
  OpenCashSessionInput,
  PurgeUnitDataInput,
  RegisterExitInput,
  RemoveUnitMemberInput,
  CloseCashSessionInput,
  UpdateClientInput,
  UpdateMyProfileInput,
  UpdateParkingSpotConfigInput,
  UpdateUnitMemberRoleInput,
  UpdateVehicleSpotInput,
} from "@/services/valet.types";

function toUnit(row: Record<string, unknown>): Unit {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    location: typeof row.location === "string" ? row.location : undefined,
    createdAt: new Date(String(row.created_at ?? new Date().toISOString())),
  };
}

function toUnitMember(row: Record<string, unknown>): UnitMember {
  return {
    userId: String(row.user_id ?? ""),
    unitId: String(row.unit_id ?? ""),
    role: String(row.role ?? "attendant") as UnitMember["role"],
    fullName: String(row.full_name ?? ""),
    email: String(row.email ?? ""),
    phone: typeof row.phone === "string" ? row.phone : undefined,
    unitName: String(row.unit_name ?? "Unidade"),
    unitLocation: typeof row.unit_location === "string" ? row.unit_location : undefined,
    createdAt: new Date(String(row.created_at ?? new Date().toISOString())),
  };
}

function toUnitInvitation(row: Record<string, unknown>): UnitInvitation {
  return {
    id: String(row.id ?? ""),
    unitId: String(row.unit_id ?? ""),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    phone: typeof row.phone === "string" ? row.phone : undefined,
    role: String(row.role ?? "attendant") as UnitInvitation["role"],
    status: String(row.status ?? "pending") as UnitInvitation["status"],
    workPeriodStart: String(row.work_period_start ?? "08:00"),
    workPeriodEnd: String(row.work_period_end ?? "17:00"),
    maxWorkHours: Number(row.max_work_hours ?? 8),
    createdAt: new Date(String(row.created_at ?? new Date().toISOString())),
  };
}

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

async function listUnits(): Promise<Unit[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase.from("units").select("*").order("created_at", { ascending: true });
  if (error) {
    return [];
  }

  return (data ?? []).map(toUnit);
}

async function listUnitMembers(): Promise<UnitMember[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase.from("unit_members_view").select("*").order("created_at", { ascending: true });
  if (error) {
    return [];
  }

  return (data ?? []).map(toUnitMember);
}

async function listUnitInvitations(): Promise<UnitInvitation[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase.from("unit_invitations").select("*").order("created_at", { ascending: false });
  if (error) {
    return [];
  }

  return (data ?? []).map(toUnitInvitation);
}

async function createUnit(input: CreateUnitInput): Promise<Unit> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("create_unit", {
    p_name: input.name,
    p_location: input.location ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }

  return toUnit(data);
}

async function createUnitInvitation(input: CreateUnitInvitationInput): Promise<UnitInvitation> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("create_unit_invitation", {
    p_name: input.name,
    p_email: input.email,
    p_phone: input.phone ?? null,
    p_role: input.role,
    p_unit_id: input.unitId ?? null,
    p_work_period_start: input.workPeriodStart,
    p_work_period_end: input.workPeriodEnd,
    p_max_work_hours: input.maxWorkHours,
  });
  if (error) {
    throw new Error(error.message);
  }

  return toUnitInvitation(data);
}

async function createManagedUser(input: CreateManagedUserInput): Promise<ManagedUserCreationResult> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.functions.invoke("create-unit-user", {
    body: {
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      role: input.role,
      unitId: input.unitId ?? null,
      workPeriodStart: input.workPeriodStart,
      workPeriodEnd: input.workPeriodEnd,
      maxWorkHours: input.maxWorkHours,
      sendInviteEmail: input.sendInviteEmail ?? true,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Resposta invalida ao criar o usuario.");
  }

  return toManagedUserCreationResult(data as Record<string, unknown>);
}

async function updateMyProfile(input: UpdateMyProfileInput) {
  ensureSupabaseConfigured();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nenhum usuario autenticado.");
  }

  const trimmedName = input.name.trim();
  const trimmedEmail = input.email.trim().toLowerCase();
  const trimmedPhone = input.phone?.trim() || null;

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: trimmedName,
    email: trimmedEmail,
    phone: trimmedPhone,
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  const metadataNeedsUpdate =
    (user.user_metadata?.full_name ?? "") !== trimmedName || (user.user_metadata?.phone ?? "") !== (trimmedPhone ?? "");
  const emailNeedsUpdate = user.email?.toLowerCase() !== trimmedEmail;

  if (metadataNeedsUpdate || emailNeedsUpdate) {
    const { error: authError } = await supabase.auth.updateUser({
      email: emailNeedsUpdate ? trimmedEmail : undefined,
      data: {
        ...user.user_metadata,
        full_name: trimmedName,
        name: trimmedName,
        phone: trimmedPhone,
      },
    });

    if (authError) {
      throw new Error(authError.message);
    }
  }

  return {
    id: user.id,
    name: trimmedName,
    email: trimmedEmail,
    phone: trimmedPhone,
  };
}

async function updateUnitMemberRole(input: UpdateUnitMemberRoleInput) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("update_unit_member_role", {
    p_user_id: input.userId,
    p_unit_id: input.unitId,
    p_role: input.role,
  });
  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function removeUnitMember(input: RemoveUnitMemberInput) {
  ensureSupabaseConfigured();
  const { error } = await supabase.rpc("remove_unit_member", {
    p_user_id: input.userId,
    p_unit_id: input.unitId,
  });
  if (error) {
    throw new Error(error.message);
  }

  return input;
}

async function purgeUnitData(input: PurgeUnitDataInput): Promise<PurgeResult> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("purge_unit_operational_data", {
    p_delete_clients: input.deleteClients,
    p_delete_attendants: input.deleteAttendants,
    p_delete_vehicles: input.deleteVehicles,
  });
  if (error) {
    throw new Error(error.message);
  }

  return {
    unitId: String(data.unitId ?? ""),
    deletedTransactions: Number(data.deletedTransactions ?? 0),
    deletedVehicles: Number(data.deletedVehicles ?? 0),
    deletedClients: Number(data.deletedClients ?? 0),
    deletedAttendantRoles: Number(data.deletedAttendantRoles ?? 0),
    deletedAttendantInvitations: Number(data.deletedAttendantInvitations ?? 0),
  };
}

async function listCashSessions(): Promise<CashSession[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from("cash_sessions_view")
    .select("*")
    .order("opened_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []).map(toCashSession);
}

async function getCurrentCashSession(): Promise<CashSession | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from("cash_sessions_view")
    .select("*")
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toCashSession(data);
}

async function openCashSession(input: OpenCashSessionInput): Promise<CashSession> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("open_cash_session", {
    p_opening_amount: input.openingAmount,
    p_opening_notes: input.openingNotes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toCashSession(data);
}

async function closeCashSession(input: CloseCashSessionInput): Promise<CashSession> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("close_current_cash_session", {
    p_closing_amount: input.closingAmount,
    p_closing_notes: input.closingNotes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toCashSession(data);
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
  getUnits: listUnits,
  getCashSessions: listCashSessions,
  getCurrentCashSession: getCurrentCashSession,
  getUnitMembers: listUnitMembers,
  getUnitInvitations: listUnitInvitations,
  createUnit: (input: CreateUnitInput) => createUnit(input),
  createUnitInvitation: (input: CreateUnitInvitationInput) => createUnitInvitation(input),
  createManagedUser: (input: CreateManagedUserInput) => createManagedUser(input),
  updateUnitMemberRole: (input: UpdateUnitMemberRoleInput) => updateUnitMemberRole(input),
  removeUnitMember: (input: RemoveUnitMemberInput) => removeUnitMember(input),
  purgeUnitData: (input: PurgeUnitDataInput) => purgeUnitData(input),
  openCashSession: (input: OpenCashSessionInput) => openCashSession(input),
  closeCashSession: (input: CloseCashSessionInput) => closeCashSession(input),
  updateMyProfile: (input: UpdateMyProfileInput) => updateMyProfile(input),
};
function toManagedUserCreationResult(row: Record<string, unknown>): ManagedUserCreationResult {
  return {
    userId: String(row.user_id ?? row.userId ?? ""),
    invitationId: String(row.invitation_id ?? row.invitationId ?? ""),
    unitId: String(row.unit_id ?? row.unitId ?? ""),
    status: String(row.status ?? "linked") as ManagedUserCreationResult["status"],
    email: String(row.email ?? ""),
    name: String(row.name ?? ""),
  };
}
