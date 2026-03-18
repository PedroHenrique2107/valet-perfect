export type UserRole = "admin" | "leader" | "attendant" | "cashier";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole | null;
  unitId?: string | null;
}

export type Permission =
  | "view_dashboard"
  | "view_vehicles"
  | "view_attendants"
  | "view_parking_map"
  | "view_financial"
  | "view_clients"
  | "create_vehicle"
  | "register_exit"
  | "assign_task"
  | "create_client";
