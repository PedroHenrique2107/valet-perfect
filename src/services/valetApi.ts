import {
  activitiesDb,
  attendantsDb,
  clientsDb,
  occupancyDataDb,
  parkingSpotsDb,
  revenueDataDb,
  transactionsDb,
  vehiclesDb,
} from "@/data/mockDb";
import {
  DEFAULT_UNIT_NAME,
  PARKING_DAILY_RATE,
  PARKING_TABLE_NAME,
  getAgreementById,
} from "@/config/pricing";
import type {
  Activity,
  Attendant,
  Client,
  ContractType,
  DashboardStats,
  OccupancyData,
  ParkingSpot,
  RevenueData,
  Transaction,
  Vehicle,
  VehicleInspection,
  VehiclePricingSnapshot,
} from "@/types/valet";

export interface CreateVehicleInput {
  plate: string;
  model: string;
  clientName: string;
  clientPhone?: string;
  observations?: string;
  prepaidAmount?: number;
  prepaidAgreementId?: string;
  prepaidPaymentMethod?: Transaction["paymentMethod"];
  contractType?: ContractType;
  unitName?: string;
  createInspection?: boolean;
  inspection?: VehicleInspection;
  hasSemParar?: boolean;
}

export interface RegisterExitInput {
  vehicleId: string;
  paymentMethod: Transaction["paymentMethod"];
  amount: number;
}

export interface AssignTaskInput {
  attendantId: string;
  vehicleId: string;
}

export interface CreateClientInput {
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  tier: Client["tier"];
}

export interface ClearAllVehiclesResult {
  removedVehicles: number;
}

const LATENCY_MS = 120;

function simulateNetwork<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), LATENCY_MS);
  });
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function createActivity(activity: Activity) {
  activitiesDb.unshift(activity);
}

function getDashboardStatsSnapshot(): DashboardStats {
  const activeVehicles = vehiclesDb.filter((vehicle) => vehicle.status !== "delivered");
  const availableSpots = parkingSpotsDb.filter((spot) => spot.status === "available").length;
  const occupiedSpots = parkingSpotsDb.filter((spot) => spot.status === "occupied").length;
  const completedTransactions = transactionsDb.filter((tx) => tx.status === "completed");
  const activeAttendants = attendantsDb.filter((attendant) => attendant.isOnline).length;
  const waitingVehicles = vehiclesDb.filter(
    (vehicle) => vehicle.status === "requested" || vehicle.status === "in_transit",
  );

  const avgStayDuration =
    activeVehicles.length > 0
      ? Math.round(
          activeVehicles.reduce((acc, vehicle) => acc + (Date.now() - vehicle.entryTime.getTime()) / 60000, 0) /
            activeVehicles.length,
        )
      : 0;

  const avgWaitTime =
    waitingVehicles.length > 0
      ? Math.round(
          (waitingVehicles.reduce((acc, vehicle) => acc + (Date.now() - vehicle.entryTime.getTime()) / 60000, 0) /
            waitingVehicles.length) *
            10,
        ) / 10
      : 0;

  return {
    totalVehicles: activeVehicles.length,
    availableSpots,
    occupancyRate: parkingSpotsDb.length > 0 ? Math.round((occupiedSpots / parkingSpotsDb.length) * 100) : 0,
    todayRevenue: completedTransactions.reduce((acc, tx) => acc + tx.amount, 0),
    avgStayDuration,
    activeAttendants,
    vehiclesWaiting: waitingVehicles.length,
    avgWaitTime,
  };
}

export const valetApi = {
  getVehicles: (): Promise<Vehicle[]> => simulateNetwork([...vehiclesDb]),
  getAttendants: (): Promise<Attendant[]> => simulateNetwork([...attendantsDb]),
  getParkingSpots: (): Promise<ParkingSpot[]> => simulateNetwork([...parkingSpotsDb]),
  getTransactions: (): Promise<Transaction[]> => simulateNetwork([...transactionsDb]),
  getRevenueData: (): Promise<RevenueData[]> => simulateNetwork([...revenueDataDb]),
  getOccupancyData: (): Promise<OccupancyData[]> => simulateNetwork([...occupancyDataDb]),
  getDashboardStats: (): Promise<DashboardStats> => simulateNetwork(getDashboardStatsSnapshot()),
  getClients: (): Promise<Client[]> => simulateNetwork([...clientsDb]),
  getActivities: (): Promise<Activity[]> => simulateNetwork([...activitiesDb]),
  clearAllVehicles: async (): Promise<ClearAllVehiclesResult> => {
    const vehicleIds = new Set(vehiclesDb.map((vehicle) => vehicle.id));
    const removedVehicles = vehiclesDb.length;
    vehiclesDb.splice(0, vehiclesDb.length);

    parkingSpotsDb.forEach((spot) => {
      if (spot.vehicleId) {
        delete spot.vehicleId;
      }
      if (spot.status === "occupied" || spot.status === "reserved") {
        spot.status = "available";
      }
    });

    attendantsDb.forEach((attendant) => {
      if (attendant.currentVehicleId && vehicleIds.has(attendant.currentVehicleId)) {
        delete attendant.currentVehicleId;
      }
      if (attendant.isOnline && attendant.status === "busy") {
        attendant.status = "available";
      }
    });

    for (let index = transactionsDb.length - 1; index >= 0; index -= 1) {
      if (vehicleIds.has(transactionsDb[index].vehicleId)) {
        transactionsDb.splice(index, 1);
      }
    }

    createActivity({
      id: createId("act"),
      type: "alert",
      title: "Base de Veiculos Limpa",
      description: `${removedVehicles} veiculo(s) removido(s) para testes`,
      time: "agora",
    });

    return simulateNetwork({ removedVehicles });
  },

  createVehicle: async (input: CreateVehicleInput): Promise<Vehicle> => {
    const availableSpot = parkingSpotsDb.find((spot) => spot.status === "available");
    if (!availableSpot) {
      throw new Error("Não há vagas disponíveis no momento");
    }

    const onlineAttendant = attendantsDb.find((attendant) => attendant.isOnline);
    if (!onlineAttendant) {
      throw new Error("Não há manobristas online no momento");
    }

    const pricing: VehiclePricingSnapshot = {
      tableName: PARKING_TABLE_NAME,
      dailyRate: PARKING_DAILY_RATE,
      agreementLabel: getAgreementById(input.prepaidAgreementId ?? "none").label,
      courtesyApplied: "Sem cortesia",
    };

    const newVehicle: Vehicle = {
      id: createId("v"),
      plate: input.plate.toUpperCase(),
      brand: "Não informado",
      model: input.model,
      color: "Não informado",
      year: new Date().getFullYear(),
      status: "parked",
      entryTime: new Date(),
      spotId: availableSpot.code,
      attendantId: onlineAttendant.id,
      clientName: input.clientName,
      clientPhone: input.clientPhone ?? "",
      observations: input.observations,
      contractType: input.contractType ?? "hourly",
      unitName: input.unitName ?? DEFAULT_UNIT_NAME,
      spotHistory: [
        {
          spotId: availableSpot.code,
          changedAt: new Date(),
          changedBy: onlineAttendant.name,
        },
      ],
      inspection: input.createInspection
        ? (input.inspection ?? {
            leftSide: true,
            rightSide: true,
            frontBumper: true,
            rearBumper: true,
            wheels: true,
            mirrors: true,
            roof: true,
            windows: true,
            interior: true,
            completedAt: new Date(),
          })
        : undefined,
      pricing,
      hasSemParar: input.hasSemParar ?? false,
    };

    vehiclesDb.unshift(newVehicle);
    const spot = parkingSpotsDb.find((item) => item.code === availableSpot.code);
    if (spot) {
      spot.status = "occupied";
      spot.vehicleId = newVehicle.id;
    }

    if ((input.prepaidAmount ?? 0) > 0) {
      transactionsDb.unshift({
        id: createId("t"),
        vehicleId: newVehicle.id,
        amount: Number(input.prepaidAmount),
        paymentMethod: input.prepaidPaymentMethod ?? "cash",
        status: "completed",
        createdAt: new Date(),
        completedAt: new Date(),
        receiptNumber: `PRE-${new Date().getFullYear()}-${String(transactionsDb.length + 1).padStart(4, "0")}`,
        duration: 0,
      });
    }

    createActivity({
      id: createId("act"),
      type: "entry",
      title: "Nova Entrada",
      description: `${newVehicle.model} - Vaga ${newVehicle.spotId}`,
      time: "agora",
      plate: newVehicle.plate,
    });

    return simulateNetwork(newVehicle);
  },

  requestVehicle: async (vehicleId: string): Promise<Vehicle> => {
    const vehicle = vehiclesDb.find((item) => item.id === vehicleId);
    if (!vehicle) {
      throw new Error("Veículo não encontrado");
    }

    vehicle.status = "requested";

    createActivity({
      id: createId("act"),
      type: "request",
      title: "Veículo Solicitado",
      description: `${vehicle.clientName} solicitou o veículo ${vehicle.plate}`,
      time: "agora",
      plate: vehicle.plate,
    });

    return simulateNetwork(vehicle);
  },

  registerVehicleExit: async (input: RegisterExitInput): Promise<Vehicle> => {
    const vehicle = vehiclesDb.find((item) => item.id === input.vehicleId);
    if (!vehicle) {
      throw new Error("Veículo não encontrado");
    }

    vehicle.status = "delivered";
    vehicle.exitTime = new Date();

    const spot = parkingSpotsDb.find((item) => item.code === vehicle.spotId);
    if (spot) {
      spot.status = "available";
      delete spot.vehicleId;
    }

    const duration = Math.max(
      1,
      Math.round((vehicle.exitTime.getTime() - vehicle.entryTime.getTime()) / 60000),
    );

    transactionsDb.unshift({
      id: createId("t"),
      vehicleId: vehicle.id,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      status: "completed",
      createdAt: new Date(),
      completedAt: new Date(),
      receiptNumber: `REC-${new Date().getFullYear()}-${String(transactionsDb.length + 1).padStart(4, "0")}`,
      duration,
    });

    createActivity({
      id: createId("act"),
      type: "exit",
      title: "Saída Registrada",
      description: `${vehicle.brand} ${vehicle.model} - ${duration} min`,
      time: "agora",
      plate: vehicle.plate,
    });

    return simulateNetwork(vehicle);
  },

  assignTask: async (input: AssignTaskInput): Promise<Attendant> => {
    const attendant = attendantsDb.find((item) => item.id === input.attendantId);
    const vehicle = vehiclesDb.find((item) => item.id === input.vehicleId);

    if (!attendant) {
      throw new Error("Manobrista não encontrado");
    }
    if (!vehicle) {
      throw new Error("Veículo não encontrado");
    }

    attendant.status = "busy";
    attendant.currentVehicleId = vehicle.id;
    vehicle.status = "in_transit";
    vehicle.attendantId = attendant.id;

    createActivity({
      id: createId("act"),
      type: "request",
      title: "Tarefa Atribuída",
      description: `${attendant.name} recebeu ${vehicle.plate}`,
      time: "agora",
      plate: vehicle.plate,
    });

    return simulateNetwork(attendant);
  },

  createClient: async (input: CreateClientInput): Promise<Client> => {
    const client: Client = {
      id: createId("c"),
      name: input.name,
      email: input.email,
      phone: input.phone,
      cpf: input.cpf,
      vehicles: [],
      tier: input.tier,
      totalVisits: 0,
      totalSpent: 0,
      cashback: 0,
      createdAt: new Date(),
    };

    clientsDb.unshift(client);

    createActivity({
      id: createId("act"),
      type: "entry",
      title: "Novo Cliente",
      description: `${client.name} foi cadastrado`,
      time: "agora",
    });

    return simulateNetwork(client);
  },
};
