export type UserRole = "admin" | "attendant" | "cashier";

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
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
