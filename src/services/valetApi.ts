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
  spotId: string;
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
}

export interface RegisterExitInput {
  vehicleId: string;
  paymentMethod: Transaction["paymentMethod"];
  amount: number;
}

export interface UpdateVehicleSpotInput {
  vehicleId: string;
  spotId: string;
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
          (waitingVehicles.reduce((acc, vehicle) => acc + (Date.now() - (vehicle.requestedAt ?? vehicle.entryTime).getTime()) / 60000, 0) /
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
    const normalizedPlate = input.plate.toUpperCase();
    const existingActiveVehicle = vehiclesDb.find(
      (vehicle) => vehicle.status !== "delivered" && vehicle.plate.toUpperCase() === normalizedPlate,
    );
    if (existingActiveVehicle) {
      throw new Error("Ja existe um veiculo ativo com esta placa");
    }

    const selectedSpot = parkingSpotsDb.find((spot) => spot.code === input.spotId);
    if (!selectedSpot) {
      throw new Error("Vaga nao encontrada");
    }
    if (selectedSpot.status !== "available") {
      throw new Error("A vaga selecionada nao esta disponivel");
    }

    const onlineAttendant = attendantsDb.find((attendant) => attendant.isOnline);
    if (!onlineAttendant) {
      throw new Error("NÃ£o hÃ¡ manobristas online no momento");
    }

    const pricing: VehiclePricingSnapshot = {
      tableName: PARKING_TABLE_NAME,
      dailyRate: PARKING_DAILY_RATE,
      agreementLabel: getAgreementById(input.prepaidAgreementId ?? "none").label,
      courtesyApplied: "Sem cortesia",
    };

    const newVehicle: Vehicle = {
      id: createId("v"),
      plate: normalizedPlate,
      brand: "NÃ£o informado",
      model: input.model,
      color: "NÃ£o informado",
      year: new Date().getFullYear(),
      status: "parked",
      entryTime: new Date(),
      spotId: selectedSpot.code,
      attendantId: onlineAttendant.id,
      clientName: input.clientName,
      clientPhone: input.clientPhone ?? "",
      observations: input.observations,
      contractType: input.contractType ?? "hourly",
      unitName: input.unitName ?? DEFAULT_UNIT_NAME,
      spotHistory: [
        {
          spotId: selectedSpot.code,
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
      
      prepaidPaid: (input.prepaidAmount ?? 0) > 0,
    };

    vehiclesDb.unshift(newVehicle);
    const spot = parkingSpotsDb.find((item) => item.code === selectedSpot.code);
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
      throw new Error("VeÃ­culo nÃ£o encontrado");
    }

    vehicle.status = "requested";
    vehicle.requestedAt = new Date();

    createActivity({
      id: createId("act"),
      type: "request",
      title: "VeÃ­culo Solicitado",
      description: `${vehicle.clientName} solicitou o veÃ­culo ${vehicle.plate}`,
      time: "agora",
      plate: vehicle.plate,
    });

    return simulateNetwork(vehicle);
  },

  updateVehicleSpot: async (input: UpdateVehicleSpotInput): Promise<Vehicle> => {
    const vehicle = vehiclesDb.find((item) => item.id === input.vehicleId);
    if (!vehicle) {
      throw new Error("VeÃƒÂ­culo nÃƒÂ£o encontrado");
    }
    if (vehicle.status === "delivered") {
      throw new Error("NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel trocar vaga de veÃƒÂ­culo entregue");
    }
    if (vehicle.spotId === input.spotId) {
      return simulateNetwork(vehicle);
    }

    const targetSpot = parkingSpotsDb.find((spot) => spot.code === input.spotId);
    if (!targetSpot) {
      throw new Error("Vaga nÃƒÂ£o encontrada");
    }
    if (targetSpot.status !== "available") {
      throw new Error("A vaga selecionada nÃƒÂ£o estÃƒÂ¡ disponÃƒÂ­vel");
    }

    const previousSpot = parkingSpotsDb.find((spot) => spot.code === vehicle.spotId);
    if (previousSpot && previousSpot.vehicleId === vehicle.id) {
      previousSpot.status = "available";
      delete previousSpot.vehicleId;
    }

    targetSpot.status = "occupied";
    targetSpot.vehicleId = vehicle.id;
    vehicle.spotId = targetSpot.code;

    const changedBy =
      attendantsDb.find((attendant) => attendant.id === vehicle.attendantId)?.name ?? "Sistema";
    vehicle.spotHistory = [
      ...(vehicle.spotHistory ?? []),
      {
        spotId: targetSpot.code,
        changedAt: new Date(),
        changedBy,
      },
    ];

    createActivity({
      id: createId("act"),
      type: "entry",
      title: "Troca de Vaga",
      description: `${vehicle.plate} movido para vaga ${targetSpot.code}`,
      time: "agora",
      plate: vehicle.plate,
    });

    return simulateNetwork(vehicle);
  },

  registerVehicleExit: async (input: RegisterExitInput): Promise<Vehicle> => {
    const vehicle = vehiclesDb.find((item) => item.id === input.vehicleId);
    if (!vehicle) {
      throw new Error("VeÃ­culo nÃ£o encontrado");
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
      title: "SaÃ­da Registrada",
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
      throw new Error("Manobrista nÃ£o encontrado");
    }
    if (!vehicle) {
      throw new Error("VeÃ­culo nÃ£o encontrado");
    }

    attendant.status = "busy";
    attendant.currentVehicleId = vehicle.id;
    vehicle.status = "in_transit";
    vehicle.attendantId = attendant.id;

    createActivity({
      id: createId("act"),
      type: "request",
      title: "Tarefa AtribuÃ­da",
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

