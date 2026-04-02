import type { SessionUser, UserRole } from "@/types/auth";
import type { ManagedUserCreationResult, PurgeResult, Unit, UnitInvitation, UnitMember } from "@/types/management";
import type {
  Activity,
  Attendant,
  CashSession,
  Client,
  DashboardStats,
  OccupancyData,
  ParkingSpot,
  RevenueData,
  Transaction,
  Vehicle,
} from "@/types/valet";
import type {
  AddClientVehicleInput,
  AssignTaskInput,
  ChargeClientInput,
  CloseCashSessionInput,
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
  UpdateClientInput,
  UpdateMyProfileInput,
  UpdateParkingSpotConfigInput,
  UpdateUnitMemberRoleInput,
  UpdateVehicleSpotInput,
} from "@/services/valet.types";

export interface LocalSession {
  userId: string;
  token: string;
  expiresAt: string;
}

interface LocalUserRecord extends SessionUser {
  password: string;
  status: "active" | "invited";
  workPeriodStart?: string;
  workPeriodEnd?: string;
  maxWorkHours?: number;
  createdAt: string;
}

interface LocalDbState {
  users: LocalUserRecord[];
  session: LocalSession | null;
  units: Unit[];
  unitMembers: UnitMember[];
  unitInvitations: UnitInvitation[];
  attendants: Attendant[];
  parkingSpots: ParkingSpot[];
  vehicles: Vehicle[];
  transactions: Transaction[];
  clients: Client[];
  cashSessions: CashSession[];
  activities: Activity[];
}

const STORAGE_KEY = "valet-perfect-local-db";
const STORAGE_VERSION_KEY = "valet-perfect-local-db-version";
const STORAGE_VERSION = "2026-04-01-empty-state-v1";
const listeners = new Set<() => void>();

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function serializeState(state: LocalDbState) {
  return JSON.stringify(state);
}

function parseDate(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

function hydrateState(raw: LocalDbState): LocalDbState {
  return {
    ...raw,
    units: raw.units.map((unit) => ({ ...unit, createdAt: new Date(unit.createdAt) })),
    unitMembers: raw.unitMembers.map((member) => ({ ...member, createdAt: new Date(member.createdAt) })),
    unitInvitations: raw.unitInvitations.map((invitation) => ({ ...invitation, createdAt: new Date(invitation.createdAt) })),
    attendants: raw.attendants.map((attendant) => ({
      ...attendant,
      startedAt: parseDate(attendant.startedAt),
    })),
    vehicles: raw.vehicles.map((vehicle) => ({
      ...vehicle,
      entryTime: new Date(vehicle.entryTime),
      requestedAt: parseDate(vehicle.requestedAt),
      exitTime: parseDate(vehicle.exitTime),
      spotHistory: vehicle.spotHistory?.map((entry) => ({ ...entry, changedAt: new Date(entry.changedAt) })),
      inspection: vehicle.inspection
        ? {
            ...vehicle.inspection,
            completedAt: new Date(vehicle.inspection.completedAt),
          }
        : undefined,
    })),
    transactions: raw.transactions.map((transaction) => ({
      ...transaction,
      createdAt: new Date(transaction.createdAt),
      completedAt: parseDate(transaction.completedAt),
    })),
    clients: raw.clients.map((client) => ({
      ...client,
      billingDueDate: new Date(client.billingDueDate),
      createdAt: new Date(client.createdAt),
    })),
    cashSessions: raw.cashSessions.map((session) => ({
      ...session,
      openedAt: new Date(session.openedAt),
      closedAt: parseDate(session.closedAt),
      report: session.report
        ? {
            ...session.report,
            entries: session.report.entries.map((entry) => ({
              ...entry,
              entryTime: parseDate(entry.entryTime),
              exitTime: parseDate(entry.exitTime),
            })),
            exits: session.report.exits.map((entry) => ({
              ...entry,
              entryTime: parseDate(entry.entryTime),
              exitTime: parseDate(entry.exitTime),
            })),
            transactions: session.report.transactions.map((transaction) => ({
              ...transaction,
              createdAt: parseDate(transaction.createdAt),
              completedAt: parseDate(transaction.completedAt),
            })),
          }
        : undefined,
    })),
  };
}

function persistState(state: LocalDbState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, serializeState(state));
  window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
}

function notify() {
  listeners.forEach((listener) => listener());
}

function shiftFromRole(role: UserRole): Attendant["shift"] {
  if (role === "cashier") return "afternoon";
  if (role === "leader") return "morning";
  return "night";
}

function emptyState(): LocalDbState {
  return {
    users: [],
    session: null,
    units: [],
    unitMembers: [],
    unitInvitations: [],
    attendants: [],
    parkingSpots: [],
    vehicles: [],
    transactions: [],
    clients: [],
    cashSessions: [],
    activities: [],
  };
}

const SEEDED_ATTENDANTS: Array<{
  id: string;
  name: string;
  status: Attendant["status"];
  shift: Attendant["shift"];
  isOnline: boolean;
  phone: string;
  currentVehicleId?: string;
  workPeriodStart: string;
  workPeriodEnd: string;
  maxWorkHours: number;
  accumulatedWorkMinutes: number;
}> = [
  { id: "seed-attendant-online", name: "Rafael Operacao", status: "online", shift: "morning", isOnline: true, phone: "(11) 98888-1001", currentVehicleId: "seed-vehicle-01", workPeriodStart: "06:00", workPeriodEnd: "14:00", maxWorkHours: 8, accumulatedWorkMinutes: 210 },
  { id: "seed-attendant-commuting", name: "Camila Patio", status: "commuting", shift: "morning", isOnline: true, phone: "(11) 98888-1002", currentVehicleId: "seed-vehicle-02", workPeriodStart: "07:00", workPeriodEnd: "15:00", maxWorkHours: 8, accumulatedWorkMinutes: 165 },
  { id: "seed-attendant-lunch", name: "Bruno Agilidade", status: "lunch", shift: "afternoon", isOnline: true, phone: "(11) 98888-1003", workPeriodStart: "10:00", workPeriodEnd: "18:00", maxWorkHours: 8, accumulatedWorkMinutes: 240 },
  { id: "seed-attendant-dinner", name: "Leandro Recolha", status: "dinner", shift: "night", isOnline: true, phone: "(11) 98888-1004", workPeriodStart: "14:00", workPeriodEnd: "22:00", maxWorkHours: 8, accumulatedWorkMinutes: 275 },
  { id: "seed-attendant-offline", name: "Marcos Reserva", status: "offline", shift: "night", isOnline: false, phone: "(11) 98888-1005", workPeriodStart: "16:00", workPeriodEnd: "00:00", maxWorkHours: 8, accumulatedWorkMinutes: 0 },
];

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000);
}

function injectOperationalMocks(base: LocalDbState): LocalDbState {
  const next = deepClone(base);
  const unitId = next.units[0]?.id ?? "unit-local";
  const unitName = next.units[0]?.name ?? "Operacao Local";

  SEEDED_ATTENDANTS.forEach((seed, index) => {
    if (next.attendants.some((attendant) => attendant.id === seed.id)) {
      return;
    }

    next.attendants.push({
      id: seed.id,
      name: seed.name,
      photo: "",
      status: seed.status,
      phone: seed.phone,
      vehiclesHandled: 25 + index * 6,
      vehiclesHandledToday: 3 + index,
      avgServiceTime: 180 + index * 20,
      rating: Math.max(4.2, 4.9 - index * 0.1),
      currentVehicleId: seed.currentVehicleId,
      shift: seed.shift,
      isOnline: seed.isOnline,
      parkingId: unitId,
      parkingName: unitName,
      workPeriodStart: seed.workPeriodStart,
      workPeriodEnd: seed.workPeriodEnd,
      maxWorkHours: seed.maxWorkHours,
      startedAt: seed.isOnline ? minutesAgo(seed.accumulatedWorkMinutes) : undefined,
      accumulatedWorkMinutes: seed.accumulatedWorkMinutes,
    });
  });

  const seededVehicleIds = new Set(next.vehicles.filter((vehicle) => vehicle.id.startsWith("seed-vehicle-")).map((vehicle) => vehicle.id));
  const remainingSlots = Math.max(0, 8 - seededVehicleIds.size);
  if (remainingSlots === 0) {
    return next;
  }

  const availableSpots = next.parkingSpots.filter((spot) => spot.status === "available").slice(0, remainingSlots);
  const seedStatuses: Array<Vehicle["status"]> = ["parked", "requested", "in_transit", "parked", "requested", "parked", "in_transit", "parked"];

  availableSpots.forEach((spot, index) => {
    const vehicleId = `seed-vehicle-${String(index + 1).padStart(2, "0")}`;
    if (next.vehicles.some((vehicle) => vehicle.id === vehicleId)) {
      return;
    }

    const status = seedStatuses[index] ?? "parked";
    const attendant = next.attendants[index % next.attendants.length];
    const mercosulPlate = `VPA${(index + 1) % 10}B${String((index + 2) % 100).padStart(2, "0")}`;
    const fallbackClientName = `Cliente Patio ${index + 1}`;

    next.vehicles.push({
      id: vehicleId,
      plate: index % 2 === 0 ? `ABC-${String(1200 + index).padStart(4, "0")}` : mercosulPlate,
      brand: index % 2 === 0 ? "Toyota" : "Honda",
      model: index % 2 === 0 ? `Corolla ${index + 1}` : `Civic ${index + 1}`,
      color: index % 2 === 0 ? "Prata" : "Preto",
      year: 2022 + (index % 3),
      status,
      entryTime: minutesAgo(40 + index * 18),
      requestedAt: status === "requested" || status === "in_transit" ? minutesAgo(8 + index * 3) : undefined,
      spotId: spot.id,
      attendantId: attendant?.id ?? SEEDED_ATTENDANTS[0].id,
      clientName: fallbackClientName,
      driverName: `Condutor ${index + 1}`,
      clientPhone: `(11) 97777-${String(1000 + index).slice(-4)}`,
      observations: status === "requested" ? "Entrega solicitada." : undefined,
      contractType: "hourly",
      unitName,
      spotHistory: [{ spotId: spot.id, changedAt: minutesAgo(40 + index * 18), changedBy: attendant?.name ?? "Sistema" }],
    });

    const targetSpot = next.parkingSpots.find((item) => item.id === spot.id);
    if (targetSpot) {
      targetSpot.status = "occupied";
      targetSpot.vehicleId = vehicleId;
    }
  });

  return next;
}

let state: LocalDbState = (() => {
  if (typeof window === "undefined") {
    return injectOperationalMocks(emptyState());
  }

  const savedVersion = window.localStorage.getItem(STORAGE_VERSION_KEY);
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw || savedVersion !== STORAGE_VERSION) {
    const initial = injectOperationalMocks(emptyState());
    persistState(initial);
    return initial;
  }

  try {
    const hydrated = hydrateState(JSON.parse(raw) as LocalDbState);
    const next = injectOperationalMocks(hydrated);
    if (JSON.stringify(next) !== JSON.stringify(hydrated)) {
      persistState(next);
    }
    return next;
  } catch {
    const initial = injectOperationalMocks(emptyState());
    persistState(initial);
    return initial;
  }
})();

function commit(mutator: (draft: LocalDbState) => void) {
  const draft = deepClone(state);
  mutator(draft);
  state = draft;
  persistState(state);
  notify();
}

function getCurrentUserRecord() {
  if (!state.session) return null;
  return state.users.find((user) => user.id === state.session?.userId) ?? null;
}

function requireCurrentUser() {
  const user = getCurrentUserRecord();
  if (!user) {
    throw new Error("Nenhum usuario autenticado.");
  }

  return user;
}

function updateCashSessionStats(draft: LocalDbState) {
  draft.cashSessions = draft.cashSessions.map((session) => {
    const sessionTransactions = draft.transactions.filter((transaction) => transaction.cashSessionId === session.id && transaction.status === "completed");
    const totalRevenue = sessionTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalEntries = draft.vehicles.filter((vehicle) => vehicle.entryCashSessionId === session.id).length;
    const totalExits = draft.vehicles.filter((vehicle) => vehicle.exitCashSessionId === session.id).length;
    const expectedAmount = session.status === "open" ? session.openingAmount + totalRevenue : session.expectedAmount ?? session.openingAmount + totalRevenue;

    return {
      ...session,
      totalRevenue,
      totalTransactions: sessionTransactions.length,
      totalEntries,
      totalExits,
      expectedAmount,
      differenceAmount:
        session.status === "closed" && typeof session.closingAmount === "number" ? session.closingAmount - expectedAmount : session.differenceAmount,
    };
  });
}

function createActivity(type: Activity["type"], title: string, description: string, plate?: string): Activity {
  return {
    id: createId("activity"),
    type,
    title,
    description,
    time: "agora",
    plate,
  };
}

function addActivity(draft: LocalDbState, activity: Activity) {
  draft.activities = [activity, ...draft.activities].slice(0, 30);
}

function currentOpenCashSession() {
  return state.cashSessions.find((session) => session.status === "open") ?? null;
}

function normalizePlateLookup(value: string) {
  return value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function findClientByPlate(plate: string) {
  const normalized = normalizePlateLookup(plate);
  return state.clients.find((client) =>
    client.vehicles.some((registeredPlate) => normalizePlateLookup(registeredPlate) === normalized),
  );
}

function summarizeCashReport(sessionId: string) {
  const session = state.cashSessions.find((item) => item.id === sessionId);
  if (!session) return undefined;

  const entries = state.vehicles
    .filter((vehicle) => vehicle.entryCashSessionId === sessionId)
    .map((vehicle) => ({
      stayId: vehicle.id,
      plate: vehicle.plate,
      clientName: vehicle.clientName,
      driverName: vehicle.driverName,
      entryTime: vehicle.entryTime,
      spotId: vehicle.spotId,
    }));

  const exits = state.vehicles
    .filter((vehicle) => vehicle.exitCashSessionId === sessionId)
    .map((vehicle) => ({
      stayId: vehicle.id,
      plate: vehicle.plate,
      clientName: vehicle.clientName,
      driverName: vehicle.driverName,
      exitTime: vehicle.exitTime,
    }));

  const transactions = state.transactions
    .filter((transaction) => transaction.cashSessionId === sessionId)
    .map((transaction) => ({
      transactionId: transaction.id,
      receiptNumber: transaction.receiptNumber,
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
      amount: transaction.amount,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
    }));

  const paymentBreakdown = transactions.reduce<NonNullable<CashSession["report"]>["paymentBreakdown"]>((acc, transaction) => {
    const existing = acc.find((item) => item.paymentMethod === transaction.paymentMethod);
    if (existing) {
      existing.count += 1;
      existing.amount += transaction.amount;
      return acc;
    }

    acc.push({ paymentMethod: transaction.paymentMethod, amount: transaction.amount, count: 1 });
    return acc;
  }, []);

  return {
    entries,
    exits,
    transactions,
    paymentBreakdown,
  };
}

export const localDb = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  reset() {
    state = emptyState();
    persistState(state);
    notify();
  },

  hasUsers() {
    return state.users.length > 0;
  },

  async registerFirstUser(input: { name: string; email: string; password: string; phone?: string }) {
    if (state.users.length > 0) {
      throw new Error("Ja existe um usuario cadastrado.");
    }

    const userId = createId("user");
    const unitId = createId("unit");
    const user: LocalUserRecord = {
      id: userId,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: "admin",
      unitId,
      phone: input.phone?.trim() || null,
      avatarUrl: null,
      password: input.password,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    const unit: Unit = {
      id: unitId,
      name: "Minha unidade",
      createdAt: new Date(),
    };

    commit((draft) => {
      draft.users.push(user);
      draft.units.push(unit);
      draft.unitMembers.push({
        userId,
        unitId,
        role: "admin",
        fullName: user.name,
        email: user.email,
        phone: user.phone ?? undefined,
        unitName: unit.name,
        createdAt: new Date(),
      });
      draft.session = {
        userId,
        token: createId("token"),
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      };
    });

    return this.getSession();
  },

  getSnapshot() {
    return deepClone(state);
  },

  getSession(): LocalSession | null {
    return state.session ? { ...state.session } : null;
  },

  getCurrentUser(): SessionUser | null {
    const user = getCurrentUserRecord();
    if (!user) return null;

    const { password: _password, status: _status, createdAt: _createdAt, ...sessionUser } = user;
    return { ...sessionUser };
  },

  async signIn(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = state.users.find((item) => item.email.toLowerCase() === normalizedEmail);

    if (!user || user.password !== password) {
      throw new Error("E-mail ou senha invalidos.");
    }

    commit((draft) => {
      draft.session = {
        userId: user.id,
        token: createId("token"),
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      };
    });

    return this.getSession();
  },

  async signOut() {
    commit((draft) => {
      draft.session = null;
    });
  },

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = state.users.find((item) => item.email.toLowerCase() === normalizedEmail);
    if (!user) {
      throw new Error("Nenhum usuario encontrado com esse e-mail.");
    }

    return { message: `Conta localizada para ${user.email}. Entre na sessao e defina uma nova senha abaixo.` };
  },

  async updatePassword(newPassword: string) {
    const user = requireCurrentUser();
    commit((draft) => {
      const target = draft.users.find((item) => item.id === user.id);
      if (target) {
        target.password = newPassword;
      }
    });
  },

  async updateMyProfile(input: UpdateMyProfileInput) {
    const user = requireCurrentUser();
    commit((draft) => {
      const target = draft.users.find((item) => item.id === user.id);
      if (!target) return;

      target.name = input.name.trim();
      target.email = input.email.trim().toLowerCase();
      target.phone = input.phone?.trim() || null;

      draft.unitMembers = draft.unitMembers.map((member) =>
        member.userId === user.id
          ? {
              ...member,
              fullName: target.name,
              email: target.email,
              phone: target.phone ?? undefined,
            }
          : member,
      );

      draft.attendants = draft.attendants.map((attendant) =>
        attendant.id === user.id
          ? {
              ...attendant,
              name: target.name,
              phone: target.phone ?? "",
            }
          : attendant,
      );
    });

    return this.getCurrentUser();
  },

  async getVehicles() {
    return state.vehicles.sort((left, right) => right.entryTime.getTime() - left.entryTime.getTime());
  },

  async getAttendants() {
    return state.attendants.sort((left, right) => left.name.localeCompare(right.name));
  },

  async getParkingSpots() {
    return state.parkingSpots.sort((left, right) => left.floor - right.floor || left.section.localeCompare(right.section) || (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  },

  async getTransactions() {
    return state.transactions.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  },

  async getClients() {
    return state.clients.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  },

  async getUnits() {
    return state.units.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  },

  async getUnitMembers() {
    return state.unitMembers.sort((left, right) => left.fullName.localeCompare(right.fullName));
  },

  async getUnitInvitations() {
    return state.unitInvitations.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  },

  async getCashSessions() {
    return state.cashSessions.sort((left, right) => right.openedAt.getTime() - left.openedAt.getTime());
  },

  async getCurrentCashSession() {
    return currentOpenCashSession();
  },

  async getRevenueData(): Promise<RevenueData[]> {
    const grouped = new Map<string, RevenueData>();
    state.transactions.forEach((transaction) => {
      const key = transaction.createdAt.toISOString().slice(0, 10);
      const current = grouped.get(key) ?? { date: key, revenue: 0, transactions: 0 };
      current.revenue += transaction.status === "completed" ? transaction.amount : 0;
      current.transactions += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.values()).sort((left, right) => left.date.localeCompare(right.date));
  },

  async getOccupancyData(): Promise<OccupancyData[]> {
    const occupied = state.parkingSpots.filter((spot) => spot.status === "occupied").length;
    const totalUsable = state.parkingSpots.filter((spot) => spot.status !== "maintenance" && spot.status !== "blocked").length;
    const occupancy = totalUsable === 0 ? 0 : Math.round((occupied / totalUsable) * 100);
    const currentHour = `${String(new Date().getHours()).padStart(2, "0")}:00`;

    return [{ hour: currentHour, occupancy }];
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const totalVehicles = state.vehicles.filter((vehicle) => vehicle.status !== "delivered").length;
    const availableSpots = state.parkingSpots.filter((spot) => spot.status === "available").length;
    const usableSpots = Math.max(1, state.parkingSpots.filter((spot) => spot.status !== "maintenance" && spot.status !== "blocked").length);
    const completedTransactions = state.transactions.filter((transaction) => transaction.status === "completed");
    const activeAttendants = state.attendants.filter((attendant) => attendant.isOnline).length;
    const vehiclesWaiting = state.vehicles.filter((vehicle) => vehicle.status === "requested" || vehicle.status === "in_transit").length;
    const avgStayDuration =
      totalVehicles === 0
        ? 0
        : Math.round(
            state.vehicles
              .filter((vehicle) => vehicle.status !== "delivered")
              .reduce((sum, vehicle) => sum + Math.max(1, Math.round((Date.now() - vehicle.entryTime.getTime()) / 60_000)), 0) / totalVehicles,
          );

    return {
      totalVehicles,
      availableSpots,
      occupancyRate: Math.round(((usableSpots - availableSpots) / usableSpots) * 100),
      todayRevenue: completedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      avgStayDuration,
      activeAttendants,
      vehiclesWaiting,
      avgWaitTime:
        vehiclesWaiting === 0
          ? 0
          : Math.round(
              state.vehicles
                .filter((vehicle) => vehicle.status === "requested" || vehicle.status === "in_transit")
                .reduce((sum, vehicle) => sum + Math.max(1, Math.round((Date.now() - (vehicle.requestedAt ?? vehicle.entryTime).getTime()) / 60_000)), 0) / vehiclesWaiting,
            ),
    };
  },

  async getActivities() {
    return state.activities;
  },

  async createVehicle(input: CreateVehicleInput) {
    const spot = state.parkingSpots.find((item) => item.id === input.spotId);
    if (!spot) throw new Error("Vaga nao encontrada.");
    if (spot.status !== "available") throw new Error("A vaga selecionada nao esta disponivel.");

    const openCash = currentOpenCashSession();
    const currentUser = requireCurrentUser();
    const linkedClient = findClientByPlate(input.plate);
    const isRecurringClient = Boolean(linkedClient);
    const newVehicle: Vehicle = {
      id: createId("stay"),
      plate: input.plate.trim().toUpperCase(),
      brand: input.model.split(" ")[0] || "Veiculo",
      model: input.model.trim(),
      color: "Nao informado",
      year: new Date().getFullYear(),
      status: "parked",
      entryTime: new Date(),
      spotId: input.spotId,
      attendantId: currentUser.id,
      clientName: input.clientName.trim(),
      driverName: input.driverName?.trim() || undefined,
      clientPhone: input.clientPhone?.trim() || "",
      observations: input.observations?.trim() || undefined,
      contractType: input.contractType ?? "hourly",
      unitName: state.units[0]?.name,
      inspection: input.createInspection ? input.inspection : undefined,
      pricing: { tableName: "Tabela local", dailyRate: 70 },
      prepaidPaid: Boolean(input.prepaidAmount),
      linkedClientId: linkedClient?.id,
      recurringClientCategory: linkedClient?.category,
      billingStatusAtEntry: isRecurringClient ? "current" : undefined,
      exemptFromCharge: isRecurringClient || Boolean(input.prepaidAmount),
      entryCashSessionId: openCash?.id,
      spotHistory: [{ spotId: input.spotId, changedAt: new Date(), changedBy: currentUser.name }],
    };

    commit((draft) => {
      draft.vehicles.unshift(newVehicle);
      draft.parkingSpots = draft.parkingSpots.map((item) =>
        item.id === input.spotId ? { ...item, status: "occupied", vehicleId: newVehicle.id } : item,
      );
      addActivity(draft, createActivity("entry", "Entrada registrada", `${newVehicle.plate} entrou na vaga ${spot.code}.`, newVehicle.plate));
      updateCashSessionStats(draft);
    });

    return newVehicle;
  },

  async requestVehicle(vehicleId: string) {
    const vehicle = state.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) throw new Error("Veiculo nao encontrado.");

    const updatedVehicle: Vehicle = { ...vehicle, status: "requested", requestedAt: new Date() };
    commit((draft) => {
      draft.vehicles = draft.vehicles.map((item) => (item.id === vehicleId ? updatedVehicle : item));
      addActivity(draft, createActivity("request", "Solicitacao de retirada", `${vehicle.plate} foi solicitado para entrega.`, vehicle.plate));
    });

    return updatedVehicle;
  },

  async registerVehicleExit(input: RegisterExitInput) {
    const vehicle = state.vehicles.find((item) => item.id === input.vehicleId);
    if (!vehicle) throw new Error("Veiculo nao encontrado.");

    const now = new Date();
    const openCash = currentOpenCashSession();
    const shouldCharge = !vehicle.exemptFromCharge && input.amount > 0;
    const transaction: Transaction = {
      id: createId("txn"),
      vehicleId: vehicle.id,
      amount: shouldCharge ? input.amount : 0,
      paymentMethod: shouldCharge ? input.paymentMethod : "monthly",
      status: "completed",
      createdAt: now,
      completedAt: now,
      receiptNumber: `REC-${Math.floor(Math.random() * 9000 + 1000)}`,
      duration: Math.max(1, Math.round((now.getTime() - vehicle.entryTime.getTime()) / 60_000)),
      cashSessionId: openCash?.id,
      clientName: vehicle.clientName,
      clientCategory: vehicle.recurringClientCategory ?? "avulso",
    };

    const updatedVehicle: Vehicle = { ...vehicle, status: "delivered", exitTime: now, exitCashSessionId: openCash?.id };

    commit((draft) => {
      if (shouldCharge) {
        draft.transactions.unshift(transaction);
      }
      draft.vehicles = draft.vehicles.map((item) => (item.id === vehicle.id ? updatedVehicle : item));
      draft.parkingSpots = draft.parkingSpots.map((spot) =>
        spot.id === vehicle.spotId ? { ...spot, status: "available", vehicleId: undefined } : spot,
      );
      addActivity(draft, createActivity("exit", "Saida registrada", `${vehicle.plate} deixou o patio.`, vehicle.plate));
      if (shouldCharge) {
        addActivity(draft, createActivity("payment", "Pagamento concluido", `Recebimento registrado para ${vehicle.plate}.`, vehicle.plate));
      }
      updateCashSessionStats(draft);
    });

    return updatedVehicle;
  },

  async assignTask(input: AssignTaskInput) {
    const attendant = state.attendants.find((item) => item.id === input.attendantId);
    const vehicle = state.vehicles.find((item) => item.id === input.vehicleId);
    if (!attendant || !vehicle) throw new Error("Manobrista ou veiculo nao encontrado.");

    const updatedAttendant: Attendant = {
      ...attendant,
      currentVehicleId: vehicle.id,
      vehiclesHandledToday: attendant.vehiclesHandledToday + 1,
      vehiclesHandled: attendant.vehiclesHandled + 1,
      status: "online",
    };

    commit((draft) => {
      draft.attendants = draft.attendants.map((item) => (item.id === attendant.id ? updatedAttendant : item));
    });

    return updatedAttendant;
  },

  async createClient(input: CreateClientInput) {
    const client: Client = {
      id: createId("client"),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      cpf: input.cpf?.trim() || undefined,
      cnpj: input.cnpj?.trim() || undefined,
      vehicles: input.vehicles.map((plate) => plate.trim().toUpperCase()),
      vehicleDrivers: input.vehicleDrivers,
      vehicleModels: input.vehicleModels,
      category: input.category,
      isVip: Boolean(input.isVip),
      includedSpots: input.includedSpots ?? 1,
      vipSpots: input.vipSpots ?? 0,
      monthlyFee: input.monthlyFee,
      billingDueDay: input.billingDueDay,
      billingDueDate: new Date(input.billingDueDate),
      totalVisits: 0,
      totalSpent: 0,
      cashback: 0,
      createdAt: new Date(),
    };

    commit((draft) => {
      draft.clients.unshift(client);
    });

    return client;
  },

  async updateClient(input: UpdateClientInput) {
    const existing = state.clients.find((client) => client.id === input.clientId);
    if (!existing) throw new Error("Cliente nao encontrado.");

    const nextVehicles = input.vehicles?.length ? input.vehicles : existing.vehicles;

    const updatedClient: Client = {
      ...existing,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      cpf: input.cpf?.trim() || undefined,
      cnpj: input.cnpj?.trim() || undefined,
      billingDueDay: input.dueDay,
      isVip: Boolean(input.isVip),
      includedSpots: input.includedSpots ?? existing.includedSpots,
      vipSpots: input.vipSpots ?? existing.vipSpots,
      monthlyFee: input.monthlyFee,
      vehicles: nextVehicles,
      vehicleDrivers: input.vehicleDrivers,
      vehicleModels: input.vehicleModels,
      billingDueDate: new Date(new Date().getFullYear(), new Date().getMonth(), input.dueDay),
    };

    commit((draft) => {
      draft.clients = draft.clients.map((client) => (client.id === existing.id ? updatedClient : client));
    });

    return updatedClient;
  },

  async addClientVehicle(input: AddClientVehicleInput) {
    const existing = state.clients.find((client) => client.id === input.clientId);
    if (!existing) throw new Error("Cliente nao encontrado.");

    const normalizedPlate = input.plate.trim().toUpperCase();
    const updatedClient: Client = {
      ...existing,
      vehicles: Array.from(new Set([...existing.vehicles, normalizedPlate])),
      vehicleDrivers: { ...(existing.vehicleDrivers ?? {}), [normalizedPlate]: input.driverName?.trim() || "" },
      vehicleModels: { ...(existing.vehicleModels ?? {}), [normalizedPlate]: input.model?.trim() || "" },
    };

    commit((draft) => {
      draft.clients = draft.clients.map((client) => (client.id === existing.id ? updatedClient : client));
    });

    return updatedClient;
  },

  async chargeClient(input: ChargeClientInput) {
    const client = state.clients.find((item) => item.id === input.clientId);
    if (!client) throw new Error("Cliente nao encontrado.");

    const openCash = currentOpenCashSession();
    const amount = input.amount ?? client.monthlyFee;
    const receiptPrefix = client.category === "agreement" ? "AGR" : "CLI";
    const transaction: Transaction = {
      id: createId("txn"),
      vehicleId: client.id,
      amount,
      paymentMethod: input.paymentMethod,
      status: "completed",
      createdAt: new Date(),
      completedAt: new Date(),
      receiptNumber: `${receiptPrefix}-${Math.floor(Math.random() * 9000 + 1000)}`,
      duration: 0,
      cashSessionId: openCash?.id,
      clientName: client.name,
      clientCategory: client.category,
    };

    commit((draft) => {
      draft.transactions.unshift(transaction);
      draft.clients = draft.clients.map((item) =>
        item.id === client.id
          ? {
              ...item,
              totalSpent: item.totalSpent + amount,
              totalVisits: item.totalVisits + 1,
              billingDueDate: new Date(item.billingDueDate.getFullYear(), item.billingDueDate.getMonth() + 1, item.billingDueDay),
            }
          : item,
      );
      addActivity(draft, createActivity("payment", "Cobranca registrada", `${client.name} teve um pagamento confirmado.`, undefined));
      updateCashSessionStats(draft);
    });

    return transaction;
  },

  async createAttendant(input: CreateAttendantInput) {
    const attendant: Attendant = {
      id: createId("attendant"),
      name: input.name.trim(),
      photo: "",
      status: "online",
      phone: input.phone.trim(),
      vehiclesHandled: 0,
      vehiclesHandledToday: 0,
      avgServiceTime: 0,
      rating: 5,
      shift: "morning",
      isOnline: true,
      parkingId: input.parkingId,
      parkingName: state.units.find((unit) => unit.id === input.parkingId)?.name ?? "Unidade",
      workPeriodStart: input.workPeriodStart,
      workPeriodEnd: input.workPeriodEnd,
      maxWorkHours: input.maxWorkHours,
      startedAt: new Date(),
      accumulatedWorkMinutes: 0,
    };

    commit((draft) => {
      draft.attendants.unshift(attendant);
    });

    return attendant;
  },

  async updateVehicleSpot(input: UpdateVehicleSpotInput) {
    const vehicle = state.vehicles.find((item) => item.id === input.vehicleId);
    const nextSpot = state.parkingSpots.find((item) => item.id === input.spotId);
    const currentUser = requireCurrentUser();
    if (!vehicle || !nextSpot) throw new Error("Veiculo ou vaga nao encontrado.");
    if (nextSpot.status !== "available") throw new Error("A nova vaga nao esta disponivel.");

    const updatedVehicle: Vehicle = {
      ...vehicle,
      spotId: nextSpot.id,
      status: vehicle.status === "requested" ? "in_transit" : vehicle.status,
      spotHistory: [...(vehicle.spotHistory ?? []), { spotId: nextSpot.id, changedAt: new Date(), changedBy: currentUser.name }],
    };

    commit((draft) => {
      draft.vehicles = draft.vehicles.map((item) => (item.id === vehicle.id ? updatedVehicle : item));
      draft.parkingSpots = draft.parkingSpots.map((spot) => {
        if (spot.id === vehicle.spotId) return { ...spot, status: "available", vehicleId: undefined };
        if (spot.id === nextSpot.id) return { ...spot, status: "occupied", vehicleId: vehicle.id };
        return spot;
      });
    });

    return updatedVehicle;
  },

  async createParkingSpot(input: CreateParkingSpotInput) {
    const spot: ParkingSpot = {
      id: createId("spot"),
      code: input.code.trim().toUpperCase(),
      floor: input.floor,
      section: input.section.trim().toUpperCase(),
      type: input.type,
      status: input.status,
      observations: input.observations?.trim() || undefined,
      sortOrder: state.parkingSpots.filter((item) => item.floor === input.floor && item.section === input.section).length + 1,
    };

    commit((draft) => {
      draft.parkingSpots.push(spot);
    });

    return spot;
  },

  async updateParkingSpotConfig(input: UpdateParkingSpotConfigInput) {
    const existing = state.parkingSpots.find((spot) => spot.id === input.spotId);
    if (!existing) throw new Error("Vaga nao encontrada.");

    const updatedSpot: ParkingSpot = {
      ...existing,
      code: input.code.trim().toUpperCase(),
      floor: input.floor,
      section: input.section.trim().toUpperCase(),
      type: input.type,
      status: input.status,
      observations: input.observations?.trim() || undefined,
    };

    commit((draft) => {
      draft.parkingSpots = draft.parkingSpots.map((spot) => (spot.id === existing.id ? updatedSpot : spot));
    });

    return updatedSpot;
  },

  async createParkingFloor(input: CreateParkingFloorInput) {
    const newSpots: ParkingSpot[] = [];
    let runningOrder = 1;
    input.sectionLayout.forEach((section, sectionIndex) => {
      for (let index = 0; index < section.capacity; index += 1) {
        const category = input.spotCategories[(sectionIndex + index) % input.spotCategories.length];
        newSpots.push({
          id: createId("spot"),
          code: `${section.name.toUpperCase()}${String(index + 1).padStart(2, "0")}`,
          floor: input.floor,
          section: section.name.toUpperCase(),
          type: category === "maintenance" ? "regular" : category,
          status: category === "maintenance" ? "maintenance" : "available",
          sortOrder: runningOrder,
        });
        runningOrder += 1;
      }
    });

    commit((draft) => {
      draft.parkingSpots.push(...newSpots);
    });

    return { floor: input.floor };
  },

  async deleteParkingFloor(floor: number) {
    commit((draft) => {
      draft.parkingSpots = draft.parkingSpots.filter((spot) => spot.floor !== floor);
    });
    return { floor };
  },

  async deleteParkingSpot(spotId: string) {
    commit((draft) => {
      draft.parkingSpots = draft.parkingSpots.filter((spot) => spot.id !== spotId);
    });
    return { spotId };
  },

  async moveParkingSpot(input: MoveParkingSpotInput) {
    const existing = state.parkingSpots.find((spot) => spot.id === input.spotId);
    if (!existing) throw new Error("Vaga nao encontrada.");

    const updatedSpot: ParkingSpot = {
      ...existing,
      floor: input.floor,
      section: input.section.trim().toUpperCase(),
      sortOrder: input.sortOrder ?? existing.sortOrder,
    };

    commit((draft) => {
      draft.parkingSpots = draft.parkingSpots.map((spot) => (spot.id === existing.id ? updatedSpot : spot));
    });

    return updatedSpot;
  },

  async createUnit(input: CreateUnitInput) {
    const unit: Unit = {
      id: createId("unit"),
      name: input.name.trim(),
      location: input.location?.trim() || undefined,
      createdAt: new Date(),
    };

    commit((draft) => {
      draft.units.push(unit);
    });

    return unit;
  },

  async createUnitInvitation(input: CreateUnitInvitationInput) {
    const invitation: UnitInvitation = {
      id: createId("invite"),
      unitId: input.unitId ?? state.units[0]?.id ?? "unit-local",
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || undefined,
      role: input.role,
      status: "pending",
      workPeriodStart: input.workPeriodStart,
      workPeriodEnd: input.workPeriodEnd,
      maxWorkHours: input.maxWorkHours,
      createdAt: new Date(),
    };

    commit((draft) => {
      draft.unitInvitations.unshift(invitation);
    });

    return invitation;
  },

  async createManagedUser(input: CreateManagedUserInput): Promise<ManagedUserCreationResult> {
    const unitId = input.unitId ?? state.units[0]?.id ?? "unit-local";
    const unit = state.units.find((item) => item.id === unitId);
    const userId = createId("user");
    const invitationId = createId("invite");
    const user: LocalUserRecord = {
      id: userId,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      unitId,
      phone: input.phone?.trim() || null,
      avatarUrl: null,
      password: createId("pwd"),
      status: input.sendInviteEmail === false ? "active" : "invited",
      workPeriodStart: input.workPeriodStart,
      workPeriodEnd: input.workPeriodEnd,
      maxWorkHours: input.maxWorkHours,
      createdAt: new Date().toISOString(),
    };

    commit((draft) => {
      draft.users.push(user);
      draft.unitMembers.push({
        userId,
        unitId,
        role: input.role,
        fullName: user.name,
        email: user.email,
        phone: user.phone ?? undefined,
        unitName: unit?.name ?? "Unidade",
        unitLocation: unit?.location,
        createdAt: new Date(),
      });
      draft.unitInvitations.unshift({
        id: invitationId,
        unitId,
        name: user.name,
        email: user.email,
        phone: user.phone ?? undefined,
        role: input.role,
        status: input.sendInviteEmail === false ? "linked" : "pending",
        workPeriodStart: input.workPeriodStart,
        workPeriodEnd: input.workPeriodEnd,
        maxWorkHours: input.maxWorkHours,
        createdAt: new Date(),
      });
      draft.attendants.push({
        id: userId,
        name: user.name,
        photo: "",
        status: "offline",
        phone: user.phone ?? "",
        vehiclesHandled: 0,
        vehiclesHandledToday: 0,
        avgServiceTime: 0,
        rating: 5,
        shift: shiftFromRole(input.role),
        isOnline: false,
        parkingId: unitId,
        parkingName: unit?.name ?? "Unidade",
        workPeriodStart: input.workPeriodStart,
        workPeriodEnd: input.workPeriodEnd,
        maxWorkHours: input.maxWorkHours,
        accumulatedWorkMinutes: 0,
      });
    });

    return {
      userId,
      invitationId,
      unitId,
      status: input.sendInviteEmail === false ? "linked" : "pending",
      email: user.email,
      name: user.name,
    };
  },

  async updateUnitMemberRole(input: UpdateUnitMemberRoleInput) {
    commit((draft) => {
      draft.unitMembers = draft.unitMembers.map((member) => (member.userId === input.userId && member.unitId === input.unitId ? { ...member, role: input.role } : member));
      draft.users = draft.users.map((user) => (user.id === input.userId ? { ...user, role: input.role } : user));
      draft.attendants = draft.attendants.map((attendant) => (attendant.id === input.userId ? { ...attendant, shift: shiftFromRole(input.role) } : attendant));
    });

    return input;
  },

  async removeUnitMember(input: RemoveUnitMemberInput) {
    commit((draft) => {
      draft.unitMembers = draft.unitMembers.filter((member) => !(member.userId === input.userId && member.unitId === input.unitId));
      draft.attendants = draft.attendants.filter((attendant) => attendant.id !== input.userId);
      draft.users = draft.users.filter((user) => user.id !== input.userId);
    });

    return input;
  },

  async purgeUnitData(input: PurgeUnitDataInput): Promise<PurgeResult> {
    const currentUser = requireCurrentUser();
    const result: PurgeResult = {
      unitId: currentUser.unitId ?? state.units[0]?.id ?? "unit-local",
      deletedTransactions: input.deleteVehicles ? state.transactions.length : 0,
      deletedVehicles: input.deleteVehicles ? state.vehicles.length : 0,
      deletedClients: input.deleteClients ? state.clients.length : 0,
      deletedAttendantRoles: input.deleteAttendants ? state.attendants.length : 0,
      deletedAttendantInvitations: input.deleteAttendants ? state.unitInvitations.length : 0,
    };

    commit((draft) => {
      if (input.deleteVehicles) {
        draft.vehicles = [];
        draft.transactions = [];
        draft.parkingSpots = draft.parkingSpots.map((spot) => ({
          ...spot,
          status: spot.status === "occupied" ? "available" : spot.status,
          vehicleId: undefined,
        }));
      }
      if (input.deleteClients) draft.clients = [];
      if (input.deleteAttendants) {
        draft.attendants = draft.attendants.filter((attendant) => attendant.id === currentUser.id);
        draft.unitInvitations = [];
      }
      updateCashSessionStats(draft);
    });

    return result;
  },

  async openCashSession(input: OpenCashSessionInput) {
    if (currentOpenCashSession()) throw new Error("Ja existe um caixa aberto.");

    const user = requireCurrentUser();
    const session: CashSession = {
      id: createId("cash"),
      unitId: user.unitId ?? state.units[0]?.id ?? "unit-local",
      attendantId: user.id,
      attendantName: user.name,
      status: "open",
      openingAmount: input.openingAmount,
      openingNotes: input.openingNotes,
      totalEntries: 0,
      totalExits: 0,
      totalRevenue: 0,
      totalTransactions: 0,
      expectedAmount: input.openingAmount,
      differenceAmount: 0,
      openedAt: new Date(),
    };

    commit((draft) => {
      draft.cashSessions.unshift(session);
    });

    return session;
  },

  async closeCashSession(input: CloseCashSessionInput) {
    const session = currentOpenCashSession();
    if (!session) throw new Error("Nao existe caixa aberto.");

    updateCashSessionStats(state);
    const expectedAmount = session.expectedAmount ?? session.openingAmount;
    const closedSession: CashSession = {
      ...session,
      status: "closed",
      closingAmount: input.closingAmount,
      closingNotes: input.closingNotes,
      closedAt: new Date(),
      expectedAmount,
      differenceAmount: input.closingAmount - expectedAmount,
      report: summarizeCashReport(session.id),
    };

    commit((draft) => {
      draft.cashSessions = draft.cashSessions.map((item) => (item.id === session.id ? closedSession : item));
      updateCashSessionStats(draft);
    });

    return closedSession;
  },
};
