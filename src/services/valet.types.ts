import type { Transaction } from "@/types/valet";
import type { UserRole } from "@/types/auth";

export interface CreateVehicleInput {
  plate: string;
  spotId: string;
  model: string;
  clientName: string;
  driverName?: string;
  clientPhone?: string;
  observations?: string;
  prepaidAmount?: number;
  prepaidAgreementId?: string;
  prepaidPaymentMethod?: Transaction["paymentMethod"];
  contractType?: "hourly" | "daily" | "monthly" | "agreement";
  unitName?: string;
  createInspection?: boolean;
  inspection?: {
    leftSide: boolean;
    rightSide: boolean;
    frontBumper: boolean;
    rearBumper: boolean;
    wheels: boolean;
    mirrors: boolean;
    roof: boolean;
    windows: boolean;
    interior: boolean;
    completedAt: Date;
  };
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

export interface UpdateParkingSpotConfigInput {
  spotId: string;
  status: "available" | "occupied" | "maintenance" | "blocked";
  type: "regular" | "vip" | "accessible" | "electric" | "motorcycle";
  code: string;
  floor: number;
  section: string;
  observations?: string;
}

export interface CreateParkingSpotInput {
  code: string;
  floor: number;
  section: string;
  type: "regular" | "vip" | "accessible" | "electric" | "motorcycle";
  status: "available" | "maintenance" | "blocked";
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

export interface MoveParkingSpotInput {
  spotId: string;
  floor: number;
  section: string;
  sortOrder?: number;
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
  cnpj?: string;
  category: "agreement" | "monthly";
  isVip?: boolean;
  includedSpots?: number;
  vipSpots?: number;
  vehicles: string[];
  vehicleDrivers?: Record<string, string>;
  vehicleModels?: Record<string, string>;
}

export interface UpdateClientInput {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  cnpj?: string;
  dueDay: number;
  isVip?: boolean;
  includedSpots?: number;
  vipSpots?: number;
  vehicleDrivers?: Record<string, string>;
  vehicleModels?: Record<string, string>;
}

export interface AddClientVehicleInput {
  clientId: string;
  plate: string;
  driverName?: string;
  model?: string;
}

export interface ChargeClientInput {
  clientId: string;
  paymentMethod: Transaction["paymentMethod"];
}

export interface CreateAttendantInput {
  name: string;
  phone: string;
  parkingId: string;
  workPeriodStart: string;
  workPeriodEnd: string;
  maxWorkHours: number;
}

export interface CreateUnitInput {
  name: string;
  location?: string;
}

export interface CreateUnitInvitationInput {
  unitId?: string;
  name: string;
  email: string;
  phone?: string;
  role: Exclude<UserRole, "admin">;
  workPeriodStart: string;
  workPeriodEnd: string;
  maxWorkHours: number;
}

export interface CreateManagedUserInput extends CreateUnitInvitationInput {
  sendInviteEmail?: boolean;
}

export interface UpdateMyProfileInput {
  name: string;
  email: string;
  phone?: string;
}

export interface UpdateUnitMemberRoleInput {
  userId: string;
  unitId: string;
  role: UserRole;
}

export interface RemoveUnitMemberInput {
  userId: string;
  unitId: string;
}

export interface PurgeUnitDataInput {
  deleteClients: boolean;
  deleteAttendants: boolean;
  deleteVehicles: boolean;
}

export interface OpenCashSessionInput {
  openingAmount: number;
  openingNotes?: string;
}

export interface CloseCashSessionInput {
  closingAmount: number;
  closingNotes?: string;
}
