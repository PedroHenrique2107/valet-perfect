import { // Mock databases
  activitiesDb,
  attendantsDb,
  clientsDb,
  occupancyDataDb,
  parkingSpotsDb,
  transactionsDb,
  vehiclesDb,
} from "@/data/mockDb";
import { // Config and helpers
  getParkingById,
  PARKING_OPTIONS,
} from "@/config/parkings";
import { // Pricing config
  DEFAULT_UNIT_NAME,
  PARKING_DAILY_RATE,
  PARKING_TABLE_NAME,
  getAgreementById,
} from "@/config/pricing"; 
import type { // Types and interfaces
  Activity,
  Attendant,
  Client,
  ContractType,
  DashboardStats,
  OccupancyData,
  ParkingSpot,
  ParkingSpotHistoryEntry,
  RevenueData,
  Transaction,
  Vehicle,
  VehicleInspection,
  VehiclePricingSnapshot,
} from "@/types/valet";

// Tipo de entrada para criar um veículo
export interface CreateVehicleInput { 
  plate: string; // Placa do veículo
  spotId: string; // ID da vaga onde o veículo será estacionado
  model: string; // Modelo do veículo
  clientName: string; // Nome do cliente proprietário do veículo
  clientPhone?: string; // Telefone do cliente (opcional)
  observations?: string; // Observações adicionais sobre o veículo ou serviço (opcional)
  prepaidAmount?: number; // Valor pré-pago para o serviço, se aplicável (opcional)
  prepaidAgreementId?: string; // ID do acordo de pré-pagamento, se aplicável (opcional)
  prepaidPaymentMethod?: Transaction["paymentMethod"]; // Método de pagamento para o pré-pagamento, se aplicável (opcional)
  contractType?: ContractType; // Tipo de contrato para o serviço (opcional, padrão é "hourly")
  unitName?: string; // Nome da unidade de cobrança, se aplicável (opcional)
  createInspection?: boolean; // Indica se deve criar uma inspeção veicular inicial (opcional, padrão é false)
  inspection?: VehicleInspection; // Detalhes da inspeção veicular, se createInspection for true (opcional)
}

// Tipo de entrada para registrar a saída de um veículo
export interface RegisterExitInput { 
  vehicleId: string; // ID do veículo que está saindo
  paymentMethod: Transaction["paymentMethod"]; // Método de pagamento utilizado para a transação de saída
  amount: number; // Valor total a ser cobrado pela estadia do veículo, calculado com base na duração e tarifas aplicáveis
}

// Tipo de entrada para atualizar a vaga de um veículo
export interface UpdateVehicleSpotInput { 
  vehicleId: string; // ID do veículo que terá a vaga atualizada
  spotId: string; // ID da nova vaga onde o veículo será movido
}

// Tipo de entrada para atualizar a configuração operacional de uma vaga
export interface UpdateParkingSpotConfigInput {
  spotId: string; // ID interno da vaga
  status: ParkingSpot["status"]; // Novo status operacional da vaga
  type: ParkingSpot["type"]; // Novo tipo da vaga
  code: string; // Codigo visivel da vaga
  floor: number; // Piso da vaga
  section: string; // Secao da vaga
  observations?: string; // Observacoes operacionais
}

// Tipo de entrada para criar uma nova vaga
export interface CreateParkingSpotInput {
  code: string;
  floor: number;
  section: string;
  type: ParkingSpot["type"];
  status: Exclude<ParkingSpot["status"], "occupied">;
  observations?: string;
}

export interface CreateParkingFloorInput {
  floor: number;
  totalSpots: number;
  spotCategories: Array<"regular" | "maintenance" | "vip" | "electric" | "accessible">;
  sectionLayout: Array<{
    name: string;
    capacity: number;
  }>;
}

// Tipo de entrada para movimentar uma vaga entre piso/secoes com drag and drop
export interface MoveParkingSpotInput {
  spotId: string;
  floor: number;
  section: string;
  sortOrder?: number;
}

// Tipo de entrada para atribuir uma tarefa de movimentação a um manobrista
export interface AssignTaskInput { 
  attendantId: string; // ID do Manobrista que receberá a tarefa
  vehicleId: string; // ID do veículo que será movimentado pelo manobrista
}

// Tipo de entrada para criar um novo cliente
export interface CreateClientInput {
  name: string; // Nome do cliente
  email: string; // Email do cliente
  phone: string; // Telefone do cliente
  cpf?: string; // CPF do cliente (opcional)
  tier: Client["tier"]; // Nível de fidelidade do cliente (ex: bronze, silver, gold)
}

// Tipo de entrada para criar um novo manobrista
export interface CreateAttendantInput {
  name: string; // Nome do manobrista
  phone: string; // Telefone do manobrista
  parkingId: string; // ID do estacionamento onde o manobrista irá trabalhar
  workPeriodStart: string; // Horário de início do período de trabalho do manobrista (formato "HH:mm")
  workPeriodEnd: string; // Horário de término do período de trabalho do manobrista (formato "HH:mm")
  maxWorkHours: number; // Número máximo de horas que o manobrista pode trabalhar em um dia
}

// Tipos de resultado para operações de limpeza de dados
export interface ClearAllVehiclesResult {
  removedVehicles: number; // Número de veículos removidos da base de dados
}


export interface ClearAllAttendantsResult { 
  removedAttendants: number; // Número de manobristas removidos da base de dados
}

const LATENCY_MS = 120; // 120 milissegundos de latência simulada para todas as operações da API

// Função utilitária para simular latência de rede em chamadas de API
function simulateNetwork<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), LATENCY_MS);
  });
}

// Função utilitária para criar IDs únicos para diferentes entidades (veículos, manobristas, transações, atividades, etc.)
function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// Função para criar uma nova atividade no sistema, adicionando-a ao início da lista de atividades (mais recentes primeiro)
function createActivity(activity: Activity) {
  activitiesDb.unshift(activity);
}

function appendSpotHistory(
  spot: ParkingSpot,
  action: string,
  details: string,
  changedBy: string = "Supervisor",
) {
  const entry: ParkingSpotHistoryEntry = {
    id: createId("spot_hist"),
    action,
    details,
    changedAt: new Date(),
    changedBy,
  };
  spot.history = [entry, ...(spot.history ?? [])];
}

function normalizeSpotCode(code: string): string {
  return code.trim().toUpperCase();
}

function normalizeSection(section: string): string {
  return section.trim().toUpperCase();
}

function getNextFloorNumber() {
  return parkingSpotsDb.reduce((maxFloor, spot) => Math.max(maxFloor, spot.floor), 0) + 1;
}

function buildGeneratedSpotCode(floor: number, section: string, index: number) {
  return `P${floor}-${section}-${String(index).padStart(2, "0")}`;
}

function ensureUniqueSpotCode(code: string, currentSpotId?: string) {
  const duplicated = parkingSpotsDb.find(
    (spot) => spot.id !== currentSpotId && normalizeSpotCode(spot.code) === code,
  );
  if (duplicated) {
    throw new Error("Ja existe uma vaga com este codigo");
  }
}

function sortSpotsInSection(spots: ParkingSpot[]) {
  spots
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
    .forEach((spot, index) => {
      spot.sortOrder = index + 1;
    });
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatRevenueDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getCompletedTransactions() {
  return transactionsDb.filter((transaction) => transaction.status === "completed");
}

function buildRevenueDataSnapshot(days: number = 7): RevenueData[] {
  const today = new Date();
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (days - index - 1));
    return {
      date,
      revenue: 0,
      transactions: 0,
    };
  });

  getCompletedTransactions().forEach((transaction) => {
    const bucket = buckets.find((item) => isSameDay(item.date, transaction.createdAt));
    if (!bucket) return;
    bucket.revenue += transaction.amount;
    bucket.transactions += 1;
  });

  return buckets.map((bucket) => ({
    date: formatRevenueDate(bucket.date),
    revenue: bucket.revenue,
    transactions: bucket.transactions,
  }));
}

// Função para calcular e retornar um snapshot dos principais indicadores do dashboard, como número total de veículos, vagas disponíveis, taxa de ocupação, receita do dia, duração média de estadia, número de manobristas ativos, veículos aguardando e tempo médio de espera
function getDashboardStatsSnapshot(): DashboardStats {
  const activeVehicles = vehiclesDb.filter((vehicle) => vehicle.status !== "delivered"); // Considera veículos em qualquer status exceto "delivered" como ativos
  const availableSpots = parkingSpotsDb.filter((spot) => spot.status === "available").length; // Conta o número de vagas disponíveis
  const occupiedSpots = parkingSpotsDb.filter((spot) => spot.status === "occupied").length; // Conta o número de vagas ocupadas
  const today = new Date();
  const completedTransactions = getCompletedTransactions(); // Filtra as transações que foram concluídas
  const activeAttendants = attendantsDb.filter((attendant) => attendant.isOnline).length; // Conta o número de manobristas ativos

  // Filtra os veículos que estão aguardando para serem entregues (status "requested" ou "in_transit")
  const waitingVehicles = vehiclesDb.filter( 
    (vehicle) => vehicle.status === "requested" || vehicle.status === "in_transit",
  );

  // Calcula a duração média de estadia dos veículos ativos, considerando o tempo desde a entrada até o momento atual, e arredonda para o número inteiro mais próximo
  const avgStayDuration =
    activeVehicles.length > 0
      ? Math.round(
          activeVehicles.reduce((acc, vehicle) => acc + (Date.now() - vehicle.entryTime.getTime()) / 60000, 0) /
            activeVehicles.length,
        )
      : 0;
  
  // Calcula o tempo médio de espera dos veículos que estão aguardando, considerando o tempo desde a solicitação até o momento atual, e arredonda para uma casa decimal
  const avgWaitTime =
    waitingVehicles.length > 0
      ? Math.round(
          (waitingVehicles.reduce((acc, vehicle) => acc + (Date.now() - (vehicle.requestedAt ?? vehicle.entryTime).getTime()) / 60000, 0) /
            waitingVehicles.length) *
            10,
        ) / 10
      : 0;

  // Retorna um objeto com os principais indicadores do dashboard
  return {
    totalVehicles: activeVehicles.length, // Número total de veículos ativos (em qualquer status exceto "delivered")
    availableSpots, // Número de vagas disponíveis
    occupancyRate: parkingSpotsDb.length > 0 ? Math.round((occupiedSpots / parkingSpotsDb.length) * 100) : 0, // Taxa de ocupação calculada como a porcentagem de vagas ocupadas em relação ao total de vagas
    todayRevenue: completedTransactions
      .filter((transaction) => isSameDay(transaction.createdAt, today))
      .reduce((acc, tx) => acc + tx.amount, 0), // Receita total do dia calculada como a soma dos valores das transações concluídas
    avgStayDuration, // Duração média de estadia dos veículos ativos, em minutos
    activeAttendants, // Número de manobristas ativos (online)
    vehiclesWaiting: waitingVehicles.length, // Número de veículos que estão aguardando para serem entregues (status "requested" ou "in_transit")
    avgWaitTime, // Tempo médio de espera dos veículos que estão aguardando, em minutos
  };
}

// Objeto que representa a API do sistema de valet, contendo métodos para obter dados, criar e atualizar veículos, atribuir tarefas a manobristas, criar clientes e manobristas, e limpar dados para testes. Cada método simula uma chamada de API com latência e manipula os dados nas "bases de dados" mockadas.
export const valetApi = {
  getVehicles: (): Promise<Vehicle[]> => simulateNetwork([...vehiclesDb]),
  getAttendants: (): Promise<Attendant[]> => simulateNetwork([...attendantsDb]),
  getParkingSpots: (): Promise<ParkingSpot[]> =>
    simulateNetwork(
      [...parkingSpotsDb].sort((left, right) => {
        if (left.floor !== right.floor) return left.floor - right.floor;
        if (left.section !== right.section) return left.section.localeCompare(right.section);
        return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
      }),
    ),
  getTransactions: (): Promise<Transaction[]> => simulateNetwork([...transactionsDb]),
  getRevenueData: (): Promise<RevenueData[]> => simulateNetwork(buildRevenueDataSnapshot()),
  getOccupancyData: (): Promise<OccupancyData[]> => simulateNetwork([...occupancyDataDb]),
  getDashboardStats: (): Promise<DashboardStats> => simulateNetwork(getDashboardStatsSnapshot()),
  getClients: (): Promise<Client[]> => simulateNetwork([...clientsDb]),
  getActivities: (): Promise<Activity[]> => simulateNetwork([...activitiesDb]),
  clearAllAttendants: async (): Promise<ClearAllAttendantsResult> => {
    // Antes de limpar os manobristas, ar
    const removedAttendants = attendantsDb.length;
    attendantsDb.splice(0, attendantsDb.length);

    // Também limpa as referências a manobristas nos veículos e vagas, e reseta o status dos veículos para "parked" se eles estavam
    createActivity({
      id: createId("act"),
      type: "alert",
      title: "Base de Manobristas Limpa",
      description: `${removedAttendants} manobrista(s) removido(s) para testes`,
      time: "agora",
    });

    // Retorna o número de manobristas removidos para informar o resultado da operação
    return simulateNetwork({ removedAttendants });
  },
  clearAllVehicles: async (): Promise<ClearAllVehiclesResult> => {
    const vehicleIds = new Set(vehiclesDb.map((vehicle) => vehicle.id));
    const removedVehicles = vehiclesDb.length;
    vehiclesDb.splice(0, vehiclesDb.length);

    // Limpa as referências aos veículos removidos nas vagas
    parkingSpotsDb.forEach((spot) => {
      if (spot.vehicleId) { // Se a vaga tem um veículo atribuído
        delete spot.vehicleId;
      }
      // Se a vaga estava ocupada ou reservada, reseta para disponível, já que o veículo foi removido
      if (spot.status === "occupied") {
        spot.status = "available"; 
      }
    });

    attendantsDb.forEach((attendant) => {
      if (attendant.currentVehicleId && vehicleIds.has(attendant.currentVehicleId)) {
        delete attendant.currentVehicleId;
      }
      if (attendant.isOnline) {
        attendant.status = "online";
      }
    });

    for (let index = transactionsDb.length - 1; index >= 0; index -= 1) {
      if (vehicleIds.has(transactionsDb[index].vehicleId)) {
        transactionsDb.splice(index, 1);
      }
    }

    // Registra uma atividade de alerta informando que a base de veículos foi limpa e quantos veículos foram removidos, para fins de monitoramento e testes
    createActivity({ 
      id: createId("act"), 
      type: "alert", 
      title: "Base de Veiculos Limpa",
      description: `${removedVehicles} veiculo(s) removido(s) para testes`,
      time: "agora",
    });

    return simulateNetwork({ removedVehicles });
  },

  // Cria um novo veículo e o adiciona à base de dados, associando-o a uma vaga disponível e a um manobrista online. Verifica se já existe um veículo ativo com a mesma placa, se a vaga selecionada está
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

    const onlineAttendant = attendantsDb.find(
      (attendant) => attendant.isOnline && attendant.status === "online",
    );
    if (!onlineAttendant) {
      throw new Error("Não há manobristas online no momento");
    }

    // Calcula o snapshot de precificação para o veículo com base na configuração de tarifas, no tipo de contrato e no acordo de pré-pagamento selecionado, para ser usado posteriormente no cálculo do valor a ser cobrado na saída
    const pricing: VehiclePricingSnapshot = {
      tableName: PARKING_TABLE_NAME,
      dailyRate: PARKING_DAILY_RATE,
      agreementLabel: getAgreementById(input.prepaidAgreementId ?? "none").label,
      courtesyApplied: "Sem cortesia",
    };

    // Cria um novo objeto de veículo com os dados fornecidos, associando-o à vaga
    const newVehicle: Vehicle = {
      id: createId("v"), // Gera um ID único para o veículo
      plate: normalizedPlate, // Armazena a placa do veículo em letras maiúsculas para padronização
      brand: "Não informado", // Marca do veículo, inicialmente definida como "Não informado" (poderia ser preenchida posteriormente com uma função de reconhecimento de marca/modelo a partir da placa)
      model: input.model, // Modelo do veículo, fornecido na entrada
      color: "Não informado", // Cor do veículo, inicialmente definida como "Não informado" (poderia ser preenchida posteriormente com uma função de reconhecimento de cor a partir da placa ou de uma inspeção visual) 
      year: new Date().getFullYear(), // Ano do veículo, inicialmente definido como o ano atual (poderia ser preenchido posteriormente com uma função de reconhecimento de ano a partir da placa ou de uma inspeção visual)
      status: "parked", // Status inicial do veículo definido como "parked" (estacionado), indicando que o veículo está na vaga, mas ainda não foi solicitado para saída
      entryTime: new Date(), // Data e hora de entrada do veículo, definida como o momento atual
      spotId: selectedSpot.code, // Código da vaga onde o veículo está estacionado, fornecido na entrada 
      attendantId: onlineAttendant.id, // ID do manobrista online que está associado ao veículo, para fins de atribuição de tarefas e monitoramento de desempenho
      clientName: input.clientName, // Nome do cliente proprietário do veículo, fornecido na entrada
      clientPhone: input.clientPhone ?? "", // Telefone do cliente, fornecido na entrada ou definido como string vazia se não for fornecido
      observations: input.observations, // Observações adicionais sobre o veículo ou serviço, fornecidas na entrada (opcional)
      contractType: input.contractType ?? "hourly", // Tipo de contrato para o serviço, fornecido na entrada ou definido como "hourly" (por hora) se não for fornecido
      unitName: input.unitName ?? DEFAULT_UNIT_NAME, // Nome da unidade de cobrança, fornecido na entrada ou definido como DEFAULT_UNIT_NAME se não for fornecido
      spotHistory: [
        {
          spotId: selectedSpot.code,
          changedAt: new Date(),
          changedBy: onlineAttendant.name,
        },
      ],
      // Se createInspection for true, usa os detalhes da inspeção fornecidos na entrada ou cria uma inspeção padrão com todos os itens marcados como "true" e a data de conclusão definida como o momento atual. Se createInspection for false ou não for fornecido, a propriedade "inspection" será undefined, indicando que nenhuma inspeção inicial foi criada para este veículo.
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

    // Adiciona o novo veículo à base de dados, associando-o à vaga selecionada e atualizando o status da vaga para "occupied". Se um valor pré-pago foi fornecido, cria uma transação de pré-pagamento associada ao veículo. Registra uma atividade de entrada para monitoramento e histórico do sistema. Retorna o novo veículo criado após simular a latência de rede.
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

    // Registra uma atividade de entrada para monitoramento e histórico do sistema, indicando que um novo veículo foi criado e estacionado na vaga selecionada
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

  // Atualiza o status de um veículo para "requested" quando ele é solicitado para saída, registra a data e hora da solicitação, e cria uma atividade de solicitação para monitoramento e histórico do sistema. Retorna o veículo atualizado após simular a latência de rede.
  requestVehicle: async (vehicleId: string): Promise<Vehicle> => {
    const vehicle = vehiclesDb.find((item) => item.id === vehicleId);
    if (!vehicle) {
      throw new Error("Veículo não encontrado");
    }

    vehicle.status = "requested";
    vehicle.requestedAt = new Date();

    // Registra uma atividade de solicitação para monitoramento e histórico do sistema, indicando que o veículo foi solicitado para saída
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

  // Atualiza a vaga de um veículo, verificando se o veículo existe, se não está entregue, se a nova vaga existe e está disponível, e atualizando as referências nas vagas e no veículo. Registra uma atividade de troca de vaga para monitoramento e histórico do sistema. Retorna o veículo atualizado após simular a latência de rede.
  updateVehicleSpot: async (input: UpdateVehicleSpotInput): Promise<Vehicle> => {
    const vehicle = vehiclesDb.find((item) => item.id === input.vehicleId);
    if (!vehicle) {
      throw new Error("Veículo não encontrado");
    }
    if (vehicle.status === "delivered") {
      throw new Error("Não é possível trocar vaga de veículo entregue");
    }
    if (vehicle.spotId === input.spotId) {
      return simulateNetwork(vehicle);
    }

    const targetSpot = parkingSpotsDb.find((spot) => spot.code === input.spotId);
    if (!targetSpot) {
      throw new Error("Vaga não encontrada");
    }
    if (targetSpot.status !== "available") {
      throw new Error("A vaga selecionada não está disponível");
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

    // Registra uma atividade de troca de vaga para monitoramento e histórico do sistema, indicando que o veículo foi movido para uma nova vaga
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

  // Atualiza a configuração operacional de uma vaga sem alterar o fluxo de entrada/saída de veículos.
  createParkingSpot: async (input: CreateParkingSpotInput): Promise<ParkingSpot> => {
    const code = normalizeSpotCode(input.code);
    const section = normalizeSection(input.section);
    ensureUniqueSpotCode(code);

    if (input.floor < 1) {
      throw new Error("O piso deve ser maior ou igual a 1");
    }

    const sectionSpots = parkingSpotsDb.filter(
      (spot) => spot.floor === input.floor && normalizeSection(spot.section) === section,
    );

    const newSpot: ParkingSpot = {
      id: createId("spot"),
      code,
      floor: input.floor,
      section,
      type: input.type,
      status: input.status,
      observations: input.observations?.trim() || undefined,
      sortOrder: sectionSpots.length + 1,
      history: [],
    };

    appendSpotHistory(newSpot, "created", "Vaga criada");
    parkingSpotsDb.push(newSpot);
    createActivity({
      id: createId("act"),
      type: "entry",
      title: "Nova Vaga Criada",
      description: `${newSpot.code} adicionada ao piso ${newSpot.floor}`,
      time: "agora",
    });
    return simulateNetwork(newSpot);
  },

  createParkingFloor: async (input: CreateParkingFloorInput): Promise<ParkingSpot[]> => {
    const nextFloor = getNextFloorNumber();
    if (input.floor !== nextFloor) {
      throw new Error(`O proximo piso disponivel e ${nextFloor}`);
    }

    if (input.totalSpots <= 0) {
      throw new Error("Informe ao menos uma vaga para criar o piso");
    }
    if (input.spotCategories.length !== input.totalSpots) {
      throw new Error("A configuracao das vagas do piso esta incompleta");
    }
    if (input.sectionLayout.length === 0) {
      throw new Error("Configure ao menos uma secao para o novo piso");
    }
    const totalSectionCapacity = input.sectionLayout.reduce((sum, section) => sum + section.capacity, 0);
    if (totalSectionCapacity < input.totalSpots) {
      throw new Error("A capacidade total das secoes e menor que a quantidade de vagas");
    }

    const createdSpots: ParkingSpot[] = [];
    const sectionCounters: Record<string, number> = {};

    input.spotCategories.forEach((category, spotIndex) => {
      const type: ParkingSpot["type"] =
        category === "vip"
          ? "vip"
          : category === "electric"
            ? "electric"
            : category === "accessible"
              ? "accessible"
              : "regular";
      const status: ParkingSpot["status"] = category === "maintenance" ? "maintenance" : "available";
      let currentCapacity = 0;
      const section =
        input.sectionLayout.find((item) => {
          currentCapacity += item.capacity;
          return spotIndex < currentCapacity;
        })?.name ?? input.sectionLayout[input.sectionLayout.length - 1].name;

      sectionCounters[section] = (sectionCounters[section] ?? 0) + 1;

      const spot: ParkingSpot = {
        id: createId("spot"),
        code: buildGeneratedSpotCode(input.floor, section, sectionCounters[section]),
        floor: input.floor,
        section,
        type,
        status,
        sortOrder: sectionCounters[section],
        history: [],
      };

      appendSpotHistory(spot, "created", `Vaga criada na geracao do piso ${input.floor}`);
      parkingSpotsDb.push(spot);
      createdSpots.push(spot);
    });

    createActivity({
      id: createId("act"),
      type: "entry",
      title: "Novo Piso Criado",
      description: `Piso ${input.floor} criado com ${createdSpots.length} vaga(s)`,
      time: "agora",
    });

    return simulateNetwork(createdSpots);
  },

  deleteParkingFloor: async (floor: number): Promise<{ floor: number; removedSpots: number }> => {
    const floorSpots = parkingSpotsDb.filter((spot) => spot.floor === floor);
    if (floorSpots.length === 0) {
      throw new Error("Piso nao encontrado");
    }

    if (floorSpots.some((spot) => spot.vehicleId)) {
      throw new Error("Nao e possivel excluir um piso com veiculos vinculados");
    }

    for (let index = parkingSpotsDb.length - 1; index >= 0; index -= 1) {
      if (parkingSpotsDb[index].floor === floor) {
        parkingSpotsDb.splice(index, 1);
      }
    }

    createActivity({
      id: createId("act"),
      type: "alert",
      title: "Piso Excluido",
      description: `Piso ${floor} removido do mapa do patio`,
      time: "agora",
    });

    return simulateNetwork({ floor, removedSpots: floorSpots.length });
  },

  deleteParkingSpot: async (spotId: string): Promise<{ spotId: string; code: string }> => {
    const spotIndex = parkingSpotsDb.findIndex((item) => item.id === spotId);
    if (spotIndex === -1) {
      throw new Error("Vaga nao encontrada");
    }

    const spot = parkingSpotsDb[spotIndex];
    if (spot.vehicleId || spot.status === "occupied") {
      throw new Error("Nao e possivel excluir uma vaga ocupada");
    }

    parkingSpotsDb.splice(spotIndex, 1);
    sortSpotsInSection(
      parkingSpotsDb.filter(
        (item) => item.floor === spot.floor && normalizeSection(item.section) === normalizeSection(spot.section),
      ),
    );

    createActivity({
      id: createId("act"),
      type: "alert",
      title: "Vaga Excluida",
      description: `${spot.code} removida do mapa do patio`,
      time: "agora",
    });

    return simulateNetwork({ spotId, code: spot.code });
  },

  updateParkingSpotConfig: async (input: UpdateParkingSpotConfigInput): Promise<ParkingSpot> => {
    const spot = parkingSpotsDb.find((item) => item.id === input.spotId);
    if (!spot) {
      throw new Error("Vaga nao encontrada");
    }

    const code = normalizeSpotCode(input.code);
    const section = normalizeSection(input.section);
    ensureUniqueSpotCode(code, spot.id);

    if (input.status === "occupied" && !spot.vehicleId) {
      throw new Error("Nao e permitido marcar uma vaga livre como ocupada manualmente");
    }

    if (spot.vehicleId && input.status !== "occupied") {
      throw new Error("Nao e possivel alterar o status de uma vaga com veiculo vinculado");
    }

    const previousSnapshot = {
      code: spot.code,
      floor: spot.floor,
      section: spot.section,
      type: spot.type,
      status: spot.status,
      observations: spot.observations,
    };

    const sectionChanged = spot.floor !== input.floor || normalizeSection(spot.section) !== section;
    if (sectionChanged) {
      const previousSectionSpots = parkingSpotsDb.filter(
        (item) => item.id !== spot.id && item.floor === spot.floor && normalizeSection(item.section) === normalizeSection(spot.section),
      );
      sortSpotsInSection(previousSectionSpots);
      const targetSectionSpots = parkingSpotsDb.filter(
        (item) => item.id !== spot.id && item.floor === input.floor && normalizeSection(item.section) === section,
      );
      spot.sortOrder = targetSectionSpots.length + 1;
    }

    spot.code = code;
    spot.floor = input.floor;
    spot.section = section;
    spot.status = input.status;
    spot.type = input.type;
    spot.observations = input.observations?.trim() || undefined;

    appendSpotHistory(
      spot,
      "updated",
      `Codigo ${previousSnapshot.code} -> ${spot.code}; piso ${previousSnapshot.floor} -> ${spot.floor}; secao ${previousSnapshot.section} -> ${spot.section}; tipo ${previousSnapshot.type} -> ${spot.type}; status ${previousSnapshot.status} -> ${spot.status}`,
    );

    createActivity({
      id: createId("act"),
      type: "alert",
      title: "Configuracao de Vaga Atualizada",
      description: `${spot.code} atualizada no mapa do patio`,
      time: "agora",
    });

    return simulateNetwork(spot);
  },

  moveParkingSpot: async (input: MoveParkingSpotInput): Promise<ParkingSpot> => {
    const spot = parkingSpotsDb.find((item) => item.id === input.spotId);
    if (!spot) {
      throw new Error("Vaga nao encontrada");
    }

    const previousFloor = spot.floor;
    const previousSection = spot.section;
    const nextSection = normalizeSection(input.section);

    if (previousFloor === input.floor && normalizeSection(previousSection) === nextSection) {
      return simulateNetwork(spot);
    }

    const previousSectionSpots = parkingSpotsDb.filter(
      (item) => item.id !== spot.id && item.floor === previousFloor && normalizeSection(item.section) === normalizeSection(previousSection),
    );
    sortSpotsInSection(previousSectionSpots);

    const targetSectionSpots = parkingSpotsDb.filter(
      (item) => item.id !== spot.id && item.floor === input.floor && normalizeSection(item.section) === nextSection,
    );

    spot.floor = input.floor;
    spot.section = nextSection;
    spot.sortOrder = input.sortOrder ?? targetSectionSpots.length + 1;

    appendSpotHistory(
      spot,
      "moved",
      `Vaga movida de piso ${previousFloor} secao ${previousSection} para piso ${spot.floor} secao ${spot.section}`,
    );

    createActivity({
      id: createId("act"),
      type: "alert",
      title: "Vaga Movida",
      description: `${spot.code} movida para piso ${spot.floor} / secao ${spot.section}`,
      time: "agora",
    });

    return simulateNetwork(spot);
  },

  // Registra a saída de um veículo, atualizando seu status para "delivered", registrando a hora de saída, liberando a vaga associada, atualizando as estatísticas do manobrista responsável, criando uma transação de pagamento para a estadia do veículo, e registrando uma atividade de saída para monitoramento e histórico do sistema. Retorna o veículo atualizado após simular a latência de rede.
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
    const attendant = attendantsDb.find((item) => item.id === vehicle.attendantId);
    if (attendant) {
      attendant.vehiclesHandled += 1;
      attendant.vehiclesHandledToday += 1;
      attendant.status = attendant.isOnline ? "online" : "offline";
      delete attendant.currentVehicleId;
    }

    // Cria uma transação de pagamento para a estadia do veículo, associando-a ao veículo e registrando o valor cobrado, o método de pagamento, e gerando um número de recibo único. O valor cobrado é fornecido na entrada, mas poderia ser calculado com base na duração da estadia e nas tarifas aplicáveis usando o snapshot de precificação armazenado no veículo.
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

    const linkedClient = clientsDb.find(
      (client) =>
        client.name.trim().toLowerCase() === vehicle.clientName.trim().toLowerCase() ||
        (vehicle.clientPhone &&
          client.phone.replace(/\D/g, "") === vehicle.clientPhone.replace(/\D/g, "")),
    );
    if (linkedClient) {
      linkedClient.totalVisits += 1;
      linkedClient.totalSpent += input.amount;
      if (!linkedClient.vehicles.includes(vehicle.plate)) {
        linkedClient.vehicles.push(vehicle.plate);
      }
    }

    createActivity({
      id: createId("act"),
      type: "payment",
      title: "Pagamento Recebido",
      description: `${input.paymentMethod.toUpperCase()} de R$ ${input.amount.toFixed(2)} - ${vehicle.clientName}`,
      time: "agora",
      plate: vehicle.plate,
    });

    // Registra uma atividade de saída para monitoramento e histórico do sistema, indicando que o veículo foi entregue e a duração da estadia, para fins de análise e acompanhamento do desempenho do serviço
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

  // Atribui uma tarefa de movimentação a um manobrista, atual
  assignTask: async (input: AssignTaskInput): Promise<Attendant> => {
    const attendant = attendantsDb.find((item) => item.id === input.attendantId);
    const vehicle = vehiclesDb.find((item) => item.id === input.vehicleId);

    if (!attendant) {
      throw new Error("Manobrista não encontrado");
    }
    if (!vehicle) {
      throw new Error("Veículo não encontrado");
    }

    attendant.status = "commuting";
    attendant.currentVehicleId = vehicle.id;
    vehicle.status = "in_transit";
    vehicle.attendantId = attendant.id;

    // Registra uma atividade de solicitação para monitoramento e histórico do sistema, indicando que o veículo foi solicitado para
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

  // Cria um novo cliente e o adiciona à base de dados, registrando uma atividade de cadastro para monitoramento e histórico do sistema. Retorna o novo cliente criado após simular a latência de rede.
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

    // Registra uma atividade de cadastro para monitoramento e histórico do sistema, indicando que um novo cliente foi criado
    createActivity({
      id: createId("act"),
      type: "entry",
      title: "Novo Cliente",
      description: `${client.name} foi cadastrado`,
      time: "agora",
    });

    return simulateNetwork(client);
  },

  // Cria um novo manobrista e o adiciona à base de dados, associando-o a um estacionamento e definindo seu período de trabalho. Verifica se os campos obrigatórios estão preenchidos, normaliza os dados de entrada, e registra uma atividade de cadastro para monitoramento e histórico do sistema. Retorna o novo manobrista criado após simular a latência de rede.
  createAttendant: async (input: CreateAttendantInput): Promise<Attendant> => {
    const normalizedPhone = input.phone.trim();
    const normalizedName = input.name.trim();
    if (!normalizedName) {
      throw new Error("Nome do manobrista e obrigatorio");
    }
    if (!normalizedPhone) {
      throw new Error("Telefone do manobrista e obrigatorio");
    }
    const parking = getParkingById(PARKING_OPTIONS[0].id);
    const shift: Attendant["shift"] =
      input.workPeriodStart < "12:00"
        ? "morning"
        : input.workPeriodStart < "18:00"
          ? "afternoon"
          : "night";

    // Antes de criar o manobrista, verifica se já existe um manobrista com o mesmo nome e telefone para evitar duplicatas, e lança um erro se encontrar um registro existente. Isso ajuda a manter a integridade dos dados e evita confusões na atribuição de tarefas e monitoramento de desempenho.
    const newAttendant: Attendant = {
      id: createId("a"),
      name: normalizedName,
      phone: normalizedPhone,
      photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedName)}`,
      status: "offline",
      vehiclesHandled: 0,
      vehiclesHandledToday: 0,
      avgServiceTime: 0,
      rating: 5,
      shift,
      isOnline: false,
      parkingId: parking.id,
      parkingName: parking.name,
      workPeriodStart: input.workPeriodStart,
      workPeriodEnd: input.workPeriodEnd,
      maxWorkHours: input.maxWorkHours,
      accumulatedWorkMinutes: 0,
    };

    attendantsDb.unshift(newAttendant);

    // Registra uma atividade de cadastro para monitoramento e histórico do sistema, indicando que um novo manobrista foi criado e associado ao estacionamento
    createActivity({
      id: createId("act"),
      type: "entry",
      title: "Novo Manobrista",
      description: `${newAttendant.name} cadastrado para ${parking.name}`,
      time: "agora",
    });

    return simulateNetwork(newAttendant);
  },
};

