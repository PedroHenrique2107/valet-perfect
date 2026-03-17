import type { Permission, UserRole } from "@/types/auth";

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "view_dashboard",
    "view_vehicles",
    "view_attendants",
    "view_parking_map",
    "view_financial",
    "view_clients",
    "create_vehicle",
    "register_exit",
    "assign_task",
    "create_client",
  ],
  attendant: [
    "view_dashboard",
    "view_vehicles",
    "view_attendants",
    "view_parking_map",
    "view_clients",
    "create_vehicle",
    "register_exit",
    "assign_task",
  ],
  cashier: [
    "view_dashboard",
    "view_vehicles",
    "view_financial",
    "view_clients",
    "register_exit",
    "create_client",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
