import { createContext, useContext, useMemo, useState } from "react";
import { hasPermission } from "@/auth/permissions";
import type { Permission, SessionUser, UserRole } from "@/types/auth";

interface AuthContextValue {
  user: SessionUser;
  setRole: (role: UserRole) => void;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_NAMES: Record<UserRole, string> = {
  admin: "Administrador",
  attendant: "Manobrista",
  cashier: "Caixa",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("admin");

  const user = useMemo<SessionUser>(
    () => ({
      id: "u1",
      name: "Pedro",
      role,
    }),
    [role],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      setRole,
      can: (permission) => hasPermission(user.role, permission),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useCan(permission: Permission): boolean {
  const { can } = useAuth();
  return can(permission);
}

export function getRoleDisplayName(role: UserRole): string {
  return ROLE_NAMES[role];
}
