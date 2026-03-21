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

export interface MockSession {
  userId: string;
  token: string;
  expiresAt: string;
}

interface MockUserRecord extends SessionUser {
  password: string;
  status: "active" | "invited";
  workPeriodStart?: string;
  workPeriodEnd?: string;
  maxWorkHours?: number;
  createdAt: string;
}

interface MockDbState {
  users: MockUserRecord[];
  session: MockSession | null;
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

const STORAGE_KEY = "valet-perfect-mock-db";
const listeners = new Set<() => void>();

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000);
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60_000);
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function serializeState(state: MockDbState) {
  return JSON.stringify(state);
}

function parseDate(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

function hydrateState(raw: MockDbState): MockDbState {
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

function persistState(state: MockDbState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, serializeState(state));
}

function notify() {
  listeners.forEach((listener) => listener());
}

function shiftFromRole(role: UserRole): Attendant["shift"] {
  if (role === "cashier") return "afternoon";
  if (role === "leader") return "morning";
  return "night";
}

function roleToAttendantStatus(role: UserRole): Attendant["status"] {
  if (role === "leader") return "commuting";
  return "online";
}

function seedState(): MockDbState {
  const unitId = "unit-matriz";
  const adminId = "user-admin";
  const leaderId = "user-leader";
  const attendantId = "user-attendant";
  const cashierId = "user-cashier";
  const openCashId = "cash-open-001";

  const users: MockUserRecord[] = [
    {
      id: adminId,
      email: "admin@valetperfect.local",
      name: "Pedro",
      role: "admin",
      unitId,
      phone: "(11) 99999-0001",
      avatarUrl: null,
      password: "123456",
      status: "active",
      createdAt: daysAgo(30).toISOString(),
    },
    {
      id: leaderId,
      email: "lider@valetperfect.local",
      name: "Camila Lider",
      role: "leader",
      unitId,
      phone: "(11) 99999-0002",
      avatarUrl: null,
      password: "123456",
      status: "active",
      workPeriodStart: "07:00",
      workPeriodEnd: "16:00",
      maxWorkHours: 8,
      createdAt: daysAgo(20).toISOString(),
    },
    {
      id: attendantId,
      email: "manobrista@valetperfect.local",
      name: "Rafael Manobrista",
      role: "attendant",
      unitId,
      phone: "(11) 99999-0003",
      avatarUrl: null,
      password: "123456",
      status: "active",
      workPeriodStart: "08:00",
      workPeriodEnd: "17:00",
      maxWorkHours: 8,
      createdAt: daysAgo(18).toISOString(),
    },
    {
      id: cashierId,
      email: "caixa@valetperfect.local",
      name: "Bruna Caixa",
      role: "cashier",
      unitId,
      phone: "(11) 99999-0004",
      avatarUrl: null,
      password: "123456",
      status: "active",
      workPeriodStart: "09:00",
      workPeriodEnd: "18:00",
      maxWorkHours: 8,
      createdAt: daysAgo(16).toISOString(),
    },
  ];

  const units: Unit[] = [
    {
      id: unitId,
      name: "Valet Perfect Matriz",
      location: "Sao Paulo - SP",
      createdAt: daysAgo(120),
    },
  ];

  const unitMembers: UnitMember[] = users.map((user) => ({
    userId: user.id,
    unitId,
    role: user.role ?? "attendant",
    fullName: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    unitName: units[0].name,
    unitLocation: units[0].location,
    createdAt: new Date(user.createdAt),
  }));

  const attendants: Attendant[] = users
    .filter((user) => user.role && user.role !== "admin")
    .map((user, index) => ({
      id: user.id,
      name: user.name,
      photo: "",
      status: roleToAttendantStatus(user.role as UserRole),
      phone: user.phone ?? "",
      vehiclesHandled: 60 - index * 8,
      vehiclesHandledToday: 5 - index,
      avgServiceTime: 240 + index * 40,
      rating: 4.6 - index * 0.1,
      currentVehicleId: index === 1 ? "stay-001" : undefined,
      shift: shiftFromRole(user.role as UserRole),
      isOnline: true,
      parkingId: unitId,
      parkingName: units[0].name,
      workPeriodStart: user.workPeriodStart ?? "08:00",
      workPeriodEnd: user.workPeriodEnd ?? "17:00",
      maxWorkHours: user.maxWorkHours ?? 8,
      startedAt: minutesAgo(240 + index * 20),
      accumulatedWorkMinutes: 240 + index * 20,
    }));

  const parkingSpots: ParkingSpot[] = [
    { id: "spot-a01", code: "A01", floor: 1, section: "A", type: "regular", status: "occupied", sortOrder: 1, vehicleId: "stay-001" },
    { id: "spot-a02", code: "A02", floor: 1, section: "A", type: "vip", status: "occupied", sortOrder: 2, vehicleId: "stay-002" },
    { id: "spot-a03", code: "A03", floor: 1, section: "A", type: "regular", status: "available", sortOrder: 3 },
    { id: "spot-b01", code: "B01", floor: 1, section: "B", type: "accessible", status: "available", sortOrder: 4 },
    { id: "spot-b02", code: "B02", floor: 1, section: "B", type: "electric", status: "maintenance", sortOrder: 5, observations: "Tomada em revisao" },
    { id: "spot-c01", code: "C01", floor: 2, section: "C", type: "regular", status: "available", sortOrder: 1 },
    { id: "spot-c02", code: "C02", floor: 2, section: "C", type: "motorcycle", status: "blocked", sortOrder: 2, observations: "Reservada para evento" },
    { id: "spot-d01", code: "D01", floor: 2, section: "D", type: "regular", status: "available", sortOrder: 3 },
  ];

  const clients: Client[] = [
    {
      id: "client-001",
      name: "Hotel Centro",
      email: "contato@hotelcentro.com",
      phone: "(11) 4000-1000",
      cnpj: "12.345.678/0001-90",
      vehicles: ["ABC1D23", "BRA2E45"],
      vehicleDrivers: { ABC1D23: "Carlos", BRA2E45: "Marina" },
      vehicleModels: { ABC1D23: "Toyota Corolla", BRA2E45: "Jeep Compass" },
      category: "agreement",
      isVip: true,
      includedSpots: 3,
      vipSpots: 1,
      monthlyFee: 2400,
      billingDueDay: 10,
      billingDueDate: new Date("2026-03-10T00:00:00"),
      totalVisits: 48,
      totalSpent: 9100,
      cashback: 0,
      createdAt: daysAgo(90),
    },
    {
      id: "client-002",
      name: "Lucas Mendes",
      email: "lucas@cliente.com",
      phone: "(11) 98888-7777",
      cpf: "123.456.789-00",
      vehicles: ["QWE4R56"],
      vehicleDrivers: { QWE4R56: "Lucas Mendes" },
      vehicleModels: { QWE4R56: "Honda Civic" },
      category: "monthly",
      isVip: false,
      includedSpots: 1,
      vipSpots: 0,
      monthlyFee: 780,
      billingDueDay: 5,
      billingDueDate: new Date("2026-03-05T00:00:00"),
      totalVisits: 22,
      totalSpent: 3900,
      cashback: 120,
      createdAt: daysAgo(65),
    },
  ];

  const vehicles: Vehicle[] = [
    {
      id: "stay-001",
      plate: "ABC1D23",
      brand: "Toyota",
      model: "Corolla",
      color: "Prata",
      year: 2023,
      status: "parked",
      entryTime: minutesAgo(145),
      spotId: "spot-a01",
      attendantId,
      clientName: "Hotel Centro",
      driverName: "Carlos",
      clientPhone: "(11) 4000-1000",
      observations: "Cliente VIP",
      contractType: "agreement",
      unitName: units[0].name,
      linkedClientId: "client-001",
      recurringClientCategory: "agreement",
      billingStatusAtEntry: "current",
      vipRequired: true,
      entryCashSessionId: openCashId,
      spotHistory: [{ spotId: "spot-a01", changedAt: minutesAgo(145), changedBy: "Rafael Manobrista" }],
    },
    {
      id: "stay-002",
      plate: "QWE4R56",
      brand: "Honda",
      model: "Civic",
      color: "Preto",
      year: 2022,
      status: "requested",
      entryTime: minutesAgo(320),
      requestedAt: minutesAgo(12),
      spotId: "spot-a02",
      attendantId: leaderId,
      clientName: "Lucas Mendes",
      driverName: "Lucas Mendes",
      clientPhone: "(11) 98888-7777",
      contractType: "monthly",
      unitName: units[0].name,
      linkedClientId: "client-002",
      recurringClientCategory: "monthly",
      billingStatusAtEntry: "current",
      entryCashSessionId: openCashId,
      spotHistory: [{ spotId: "spot-a02", changedAt: minutesAgo(320), changedBy: "Camila Lider" }],
    },
  ];

  const transactions: Transaction[] = [
    {
      id: "txn-001",
      vehicleId: "stay-001",
      amount: 48,
      paymentMethod: "pix",
      status: "completed",
      createdAt: minutesAgo(30),
      completedAt: minutesAgo(28),
      receiptNumber: "REC-1001",
      duration: 145,
      cashSessionId: openCashId,
    },
  ];

  const cashSessions: CashSession[] = [
    {
      id: "cash-closed-001",
      unitId,
      attendantId: cashierId,
      attendantName: "Bruna Caixa",
      status: "closed",
      openingAmount: 200,
      closingAmount: 612,
      expectedAmount: 600,
      differenceAmount: 12,
      totalEntries: 9,
      totalExits: 8,
      totalRevenue: 400,
      totalTransactions: 8,
      openingNotes: "Troco inicial",
      closingNotes: "Fechamento sem divergencias relevantes.",
      openedAt: daysAgo(1),
      closedAt: new Date(daysAgo(1).getTime() + 8 * 60 * 60_000),
      report: {
        entries: [
          { stayId: "stay-old-1", plate: "AAA0A00", clientName: "Cliente Historico", driverName: "Joao", entryTime: daysAgo(1), spotId: "spot-c01" },
        ],
        exits: [
          { stayId: "stay-old-1", plate: "AAA0A00", clientName: "Cliente Historico", driverName: "Joao", exitTime: new Date(daysAgo(1).getTime() + 2 * 60 * 60_000) },
        ],
        transactions: [
          { transactionId: "txn-old-1", receiptNumber: "REC-0950", paymentMethod: "cash", status: "completed", amount: 35, createdAt: daysAgo(1), completedAt: daysAgo(1) },
        ],
        paymentBreakdown: [{ paymentMethod: "cash", amount: 400, count: 8 }],
      },
    },
    {
      id: openCashId,
      unitId,
      attendantId: cashierId,
      attendantName: "Bruna Caixa",
      status: "open",
      openingAmount: 150,
      expectedAmount: 198,
      differenceAmount: 0,
      totalEntries: 2,
      totalExits: 0,
      totalRevenue: 48,
      totalTransactions: 1,
      openingNotes: "Troco para o turno da manha",
      openedAt: minutesAgo(190),
    },
  ];

  const activities: Activity[] = [
    { id: "activity-001", type: "entry", title: "Entrada registrada", description: "ABC1D23 entrou pela portaria principal.", time: "2h atras", plate: "ABC1D23" },
    { id: "activity-002", type: "request", title: "Solicitacao de retirada", description: "QWE4R56 foi solicitado pelo cliente.", time: "12 min atras", plate: "QWE4R56" },
    { id: "activity-003", type: "payment", title: "Pagamento concluido", description: "Recebimento via PIX confirmado.", time: "28 min atras", plate: "ABC1D23" },
  ];

  return {
    users,
    session: { userId: adminId, token: "mock-session-token", expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString() },
    units,
    unitMembers,
    unitInvitations: [],
    attendants,
    parkingSpots,
    vehicles,
    transactions,
    clients,
    cashSessions,
    activities,
  };
}

let state: MockDbState = (() => {
  if (typeof window === "undefined") {
    return seedState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedState();
    persistState(seeded);
    return seeded;
  }

  try {
    return hydrateState(JSON.parse(raw) as MockDbState);
  } catch {
    const seeded = seedState();
    persistState(seeded);
    return seeded;
  }
})();

function commit(mutator: (draft: MockDbState) => void) {
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

function updateCashSessionStats(draft: MockDbState) {
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

function addActivity(draft: MockDbState, activity: Activity) {
  draft.activities = [activity, ...draft.activities].slice(0, 30);
}

function currentOpenCashSession() {
  return state.cashSessions.find((session) => session.status === "open") ?? null;
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

export const mockDb = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  reset() {
    state = seedState();
    persistState(state);
    notify();
  },

  getSnapshot() {
    return deepClone(state);
  },

  getSession(): MockSession | null {
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
      throw new Error("E-mail ou senha invalidos. Use uma das contas demo e a senha 123456.");
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
      throw new Error("Nenhum usuario mock encontrado com esse e-mail.");
    }

    return { message: `Modo mock ativo: a senha atual de ${user.email} e 123456.` };
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
    const totalUsable = Math.max(1, state.parkingSpots.filter((spot) => spot.status !== "maintenance" && spot.status !== "blocked").length);

    return Array.from({ length: 8 }, (_, index) => ({
      hour: `${String(9 + index).padStart(2, "0")}:00`,
      occupancy: Math.min(100, Math.round(((occupied + (index % 3)) / totalUsable) * 100)),
    }));
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
      avgWaitTime: vehiclesWaiting === 0 ? 0 : 7,
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
    const transaction: Transaction = {
      id: createId("txn"),
      vehicleId: vehicle.id,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      status: "completed",
      createdAt: now,
      completedAt: now,
      receiptNumber: `REC-${Math.floor(Math.random() * 9000 + 1000)}`,
      duration: Math.max(1, Math.round((now.getTime() - vehicle.entryTime.getTime()) / 60_000)),
      cashSessionId: openCash?.id,
    };

    const updatedVehicle: Vehicle = { ...vehicle, status: "delivered", exitTime: now, exitCashSessionId: openCash?.id };

    commit((draft) => {
      draft.transactions.unshift(transaction);
      draft.vehicles = draft.vehicles.map((item) => (item.id === vehicle.id ? updatedVehicle : item));
      draft.parkingSpots = draft.parkingSpots.map((spot) =>
        spot.id === vehicle.spotId ? { ...spot, status: "available", vehicleId: undefined } : spot,
      );
      addActivity(draft, createActivity("exit", "Saida registrada", `${vehicle.plate} deixou o patio.`, vehicle.plate));
      addActivity(draft, createActivity("payment", "Pagamento concluido", `Recebimento registrado para ${vehicle.plate}.`, vehicle.plate));
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
    const transaction: Transaction = {
      id: createId("txn"),
      vehicleId: client.id,
      amount,
      paymentMethod: input.paymentMethod,
      status: "completed",
      createdAt: new Date(),
      completedAt: new Date(),
      receiptNumber: `REC-${Math.floor(Math.random() * 9000 + 1000)}`,
      duration: 0,
      cashSessionId: openCash?.id,
    };

    commit((draft) => {
      draft.transactions.unshift(transaction);
      draft.clients = draft.clients.map((item) => (item.id === client.id ? { ...item, totalSpent: item.totalSpent + amount } : item));
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
    const user: MockUserRecord = {
      id: userId,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      unitId,
      phone: input.phone?.trim() || null,
      avatarUrl: null,
      password: "123456",
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
