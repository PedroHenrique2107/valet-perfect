import type {
  Activity,
  Attendant,
  BillingStatus,
  Client,
  ClientCategory,
  DashboardStats,
  OccupancyData,
  ParkingSpot,
  PaymentMethod,
  PaymentStatus,
  RevenueData,
  Transaction,
  Vehicle,
  VehicleInspection,
  VehiclePricingSnapshot,
  VehicleStatus,
} from "@/types/valet";

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  totalVehicles: 0,
  availableSpots: 0,
  occupancyRate: 0,
  todayRevenue: 0,
  avgStayDuration: 0,
  activeAttendants: 0,
  vehiclesWaiting: 0,
  avgWaitTime: 0,
};

export function isSupabaseConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para usar o backend.");
  }
}

export function parseDate(value: string | Date | null | undefined, fallback = new Date()) {
  if (!value) {
    return fallback;
  }

  return value instanceof Date ? value : new Date(value);
}

export function normalizePlate(value: string) {
  return value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

export function toVehicle(row: Record<string, unknown>): Vehicle {
  return {
    id: String(row.id),
    plate: String(row.plate ?? ""),
    brand: String(row.brand ?? ""),
    model: String(row.model ?? ""),
    color: String(row.color ?? ""),
    year: Number(row.year ?? 0),
    status: (row.status as VehicleStatus | undefined) ?? "parked",
    entryTime: parseDate(row.entry_time as string | undefined),
    requestedAt: row.requested_at ? parseDate(row.requested_at as string) : undefined,
    exitTime: row.exit_time ? parseDate(row.exit_time as string) : undefined,
    spotId: String(row.parking_spot_id ?? row.spot_id ?? ""),
    attendantId: String(row.attendant_id ?? ""),
    clientName: String(row.client_name ?? ""),
    driverName: typeof row.driver_name === "string" ? row.driver_name : undefined,
    clientPhone: String(row.client_phone ?? ""),
    observations: typeof row.observations === "string" ? row.observations : undefined,
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : undefined,
    fuelLevel: typeof row.fuel_level === "number" ? row.fuel_level : undefined,
    mileage: typeof row.mileage === "number" ? row.mileage : undefined,
    contractType: row.contract_type as Vehicle["contractType"],
    unitName: typeof row.unit_name === "string" ? row.unit_name : undefined,
    inspection: (row.inspection as VehicleInspection | null) ?? undefined,
    pricing: (row.pricing_snapshot as VehiclePricingSnapshot | null) ?? undefined,
    prepaidPaid: typeof row.prepaid_paid === "boolean" ? row.prepaid_paid : undefined,
    linkedClientId: typeof row.linked_client_id === "string" ? row.linked_client_id : undefined,
    recurringClientCategory: row.recurring_client_category as ClientCategory | undefined,
    billingStatusAtEntry: row.billing_status_at_entry as BillingStatus | undefined,
    vipRequired: typeof row.vip_required === "boolean" ? row.vip_required : undefined,
    exemptFromCharge: typeof row.exempt_from_charge === "boolean" ? row.exempt_from_charge : undefined,
  };
}

export function toAttendant(row: Record<string, unknown>): Attendant {
  return {
    id: String(row.id),
    name: String(row.full_name ?? row.name ?? ""),
    photo: String(row.avatar_url ?? ""),
    status: (row.status as Attendant["status"] | undefined) ?? "offline",
    phone: String(row.phone ?? ""),
    vehiclesHandled: Number(row.vehicles_handled ?? 0),
    vehiclesHandledToday: Number(row.vehicles_handled_today ?? 0),
    avgServiceTime: Number(row.avg_service_time ?? 0),
    rating: Number(row.rating ?? 0),
    currentVehicleId: typeof row.current_vehicle_id === "string" ? row.current_vehicle_id : undefined,
    shift: (row.shift as Attendant["shift"] | undefined) ?? "morning",
    isOnline: Boolean(row.is_online),
    parkingId: String(row.parking_id ?? ""),
    parkingName: String(row.parking_name ?? ""),
    workPeriodStart: String(row.work_period_start ?? "08:00"),
    workPeriodEnd: String(row.work_period_end ?? "17:00"),
    maxWorkHours: Number(row.max_work_hours ?? 8),
    startedAt: row.started_at ? parseDate(row.started_at as string) : undefined,
    accumulatedWorkMinutes: Number(row.accumulated_work_minutes ?? 0),
  };
}

export function toParkingSpot(row: Record<string, unknown>): ParkingSpot {
  return {
    id: String(row.id),
    code: String(row.code ?? ""),
    floor: Number(row.floor ?? 0),
    section: String(row.section ?? ""),
    type: (row.type as ParkingSpot["type"] | undefined) ?? "regular",
    status: (row.status as ParkingSpot["status"] | undefined) ?? "available",
    usageRule: typeof row.usage_rule === "string" ? row.usage_rule : undefined,
    capacity: typeof row.capacity === "number" ? row.capacity : undefined,
    observations: typeof row.observations === "string" ? row.observations : undefined,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : undefined,
    history: Array.isArray(row.history) ? (row.history as ParkingSpot["history"]) : undefined,
    vehicleId: typeof row.vehicle_id === "string" ? row.vehicle_id : undefined,
  };
}

export function toTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_stay_id ?? row.vehicle_id ?? ""),
    amount: Number(row.amount ?? 0),
    paymentMethod: (row.payment_method as PaymentMethod | undefined) ?? "pix",
    status: (row.status as PaymentStatus | undefined) ?? "pending",
    createdAt: parseDate(row.created_at as string | undefined),
    completedAt: row.completed_at ? parseDate(row.completed_at as string) : undefined,
    receiptNumber: String(row.receipt_number ?? ""),
    duration: Number(row.duration_minutes ?? row.duration ?? 0),
  };
}

export function toClient(row: Record<string, unknown>, vehicleRows: Array<Record<string, unknown>>): Client {
  const relatedVehicles = vehicleRows.filter((vehicle) => String(vehicle.client_id) === String(row.id));

  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    cpf: typeof row.cpf === "string" ? row.cpf : undefined,
    cnpj: typeof row.cnpj === "string" ? row.cnpj : undefined,
    vehicles: relatedVehicles.map((vehicle) => String(vehicle.plate ?? "")).filter(Boolean),
    vehicleDrivers: Object.fromEntries(
      relatedVehicles
        .filter((vehicle) => typeof vehicle.driver_name === "string")
        .map((vehicle) => [normalizePlate(String(vehicle.plate ?? "")), String(vehicle.driver_name)]),
    ),
    vehicleModels: Object.fromEntries(
      relatedVehicles
        .filter((vehicle) => typeof vehicle.model === "string")
        .map((vehicle) => [normalizePlate(String(vehicle.plate ?? "")), String(vehicle.model)]),
    ),
    category: (row.category as Client["category"] | undefined) ?? "monthly",
    isVip: Boolean(row.is_vip),
    includedSpots: Number(row.included_spots ?? 0),
    vipSpots: Number(row.vip_spots ?? 0),
    monthlyFee: Number(row.monthly_fee ?? 0),
    billingDueDay: Number(row.billing_due_day ?? 1),
    billingDueDate: parseDate(row.billing_due_date as string | undefined),
    totalVisits: Number(row.total_visits ?? 0),
    totalSpent: Number(row.total_spent ?? 0),
    cashback: Number(row.cashback ?? 0),
    createdAt: parseDate(row.created_at as string | undefined),
  };
}

export function toRevenueData(row: Record<string, unknown>): RevenueData {
  return {
    date: String(row.date_label ?? row.date ?? ""),
    revenue: Number(row.revenue ?? 0),
    transactions: Number(row.transactions ?? 0),
  };
}

export function toOccupancyData(row: Record<string, unknown>): OccupancyData {
  return {
    hour: String(row.hour ?? ""),
    occupancy: Number(row.occupancy ?? 0),
  };
}

export function toActivity(row: Record<string, unknown>): Activity {
  return {
    id: String(row.id),
    type: (row.type as Activity["type"] | undefined) ?? "alert",
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    time: String(row.time_label ?? row.time ?? ""),
    plate: typeof row.plate === "string" ? row.plate : undefined,
  };
}
