import type { UserRole } from "@/types/auth";

export interface Unit {
  id: string;
  name: string;
  location?: string;
  createdAt: Date;
}

export interface UnitMember {
  userId: string;
  unitId: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  unitName: string;
  unitLocation?: string;
  createdAt: Date;
}

export interface UnitInvitation {
  id: string;
  unitId: string;
  name: string;
  email: string;
  phone?: string;
  role: Exclude<UserRole, "admin">;
  status: "pending" | "linked" | "cancelled";
  workPeriodStart: string;
  workPeriodEnd: string;
  maxWorkHours: number;
  createdAt: Date;
}

export interface PurgeResult {
  unitId: string;
  deletedTransactions: number;
  deletedVehicles: number;
  deletedClients: number;
  deletedAttendantRoles: number;
  deletedAttendantInvitations: number;
}
