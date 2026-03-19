import type {
  Activity,
  Attendant,
  CashSession,
  CashSessionPaymentBreakdown,
  CashSessionReport,
  CashSessionReportEntry,
  CashSessionReportTransaction,
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
    entryCashSessionId: typeof row.entry_cash_session_id === "string" ? row.entry_cash_session_id : undefined,
    exitCashSessionId: typeof row.exit_cash_session_id === "string" ? row.exit_cash_session_id : undefined,
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
    cashSessionId: typeof row.cash_session_id === "string" ? row.cash_session_id : undefined,
  };
}

function toCashSessionReportEntry(row: Record<string, unknown>, type: "entry" | "exit"): CashSessionReportEntry {
  return {
    stayId: String(row.stayId ?? row.stay_id ?? ""),
    plate: String(row.plate ?? ""),
    clientName: String(row.clientName ?? row.client_name ?? ""),
    driverName: typeof row.driverName === "string" ? row.driverName : typeof row.driver_name === "string" ? row.driver_name : undefined,
    entryTime:
      type === "entry" && (row.entryTime ?? row.entry_time)
        ? parseDate((row.entryTime ?? row.entry_time) as string)
        : undefined,
    exitTime:
      type === "exit" && (row.exitTime ?? row.exit_time)
        ? parseDate((row.exitTime ?? row.exit_time) as string)
        : undefined,
    spotId: typeof row.spotId === "string" ? row.spotId : typeof row.spot_id === "string" ? row.spot_id : undefined,
  };
}

function toCashSessionReportTransaction(row: Record<string, unknown>): CashSessionReportTransaction {
  return {
    transactionId: String(row.transactionId ?? row.transaction_id ?? ""),
    receiptNumber: String(row.receiptNumber ?? row.receipt_number ?? ""),
    paymentMethod: (row.paymentMethod ?? row.payment_method ?? "pix") as CashSessionReportTransaction["paymentMethod"],
    status: (row.status ?? "completed") as CashSessionReportTransaction["status"],
    amount: Number(row.amount ?? 0),
    createdAt: row.createdAt || row.created_at ? parseDate((row.createdAt ?? row.created_at) as string) : undefined,
    completedAt: row.completedAt || row.completed_at ? parseDate((row.completedAt ?? row.completed_at) as string) : undefined,
  };
}

function toCashSessionPaymentBreakdown(row: Record<string, unknown>): CashSessionPaymentBreakdown {
  return {
    paymentMethod: (row.paymentMethod ?? row.payment_method ?? "pix") as CashSessionPaymentBreakdown["paymentMethod"],
    amount: Number(row.amount ?? 0),
    count: Number(row.count ?? 0),
  };
}

function toCashSessionReport(row: Record<string, unknown> | null | undefined): CashSessionReport | undefined {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  const entries = Array.isArray(row.entries)
    ? row.entries.map((item) => toCashSessionReportEntry(item as Record<string, unknown>, "entry"))
    : [];
  const exits = Array.isArray(row.exits)
    ? row.exits.map((item) => toCashSessionReportEntry(item as Record<string, unknown>, "exit"))
    : [];
  const transactions = Array.isArray(row.transactions)
    ? row.transactions.map((item) => toCashSessionReportTransaction(item as Record<string, unknown>))
    : [];
  const paymentBreakdown = Array.isArray(row.paymentBreakdown)
    ? row.paymentBreakdown.map((item) => toCashSessionPaymentBreakdown(item as Record<string, unknown>))
    : [];

  return {
    entries,
    exits,
    transactions,
    paymentBreakdown,
  };
}

export function toCashSession(row: Record<string, unknown>): CashSession {
  return {
    id: String(row.id ?? ""),
    unitId: String(row.unit_id ?? ""),
    attendantId: String(row.attendant_id ?? ""),
    attendantName: String(row.attendant_name ?? "Usuario"),
    status: (row.status ?? "open") as CashSession["status"],
    openingAmount: Number(row.opening_amount ?? 0),
    closingAmount: row.closing_amount == null ? undefined : Number(row.closing_amount),
    expectedAmount: row.expected_amount == null ? undefined : Number(row.expected_amount),
    differenceAmount: row.difference_amount == null ? undefined : Number(row.difference_amount),
    totalEntries: Number(row.total_entries ?? 0),
    totalExits: Number(row.total_exits ?? 0),
    totalRevenue: Number(row.total_revenue ?? 0),
    totalTransactions: Number(row.total_transactions ?? 0),
    openingNotes: typeof row.opening_notes === "string" ? row.opening_notes : undefined,
    closingNotes: typeof row.closing_notes === "string" ? row.closing_notes : undefined,
    openedAt: parseDate(row.opened_at as string | undefined),
    closedAt: row.closed_at ? parseDate(row.closed_at as string) : undefined,
    report: toCashSessionReport((row.report as Record<string, unknown> | null | undefined) ?? undefined),
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
