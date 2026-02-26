import type { Permission, UserRole } from "@/types/auth";

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "view_dashboard",
    "view_vehicles",
    "view_attendants",
    "view_parking_map",
    "view_financial",
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
    "create_vehicle",
    "register_exit",
    "assign_task",
  ],
  cashier: [
    "view_dashboard",
    "view_vehicles",
    "view_financial",
    "register_exit",
    "create_client",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
