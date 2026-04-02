import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hasPermission } from "@/auth/permissions";
import { localDb, type LocalSession } from "@/data/localDb";
import type { Permission, SessionUser, UserRole } from "@/types/auth";

interface AuthContextValue {
  user: SessionUser | null;
  session: LocalSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasUsers: boolean;
  registerFirstUser: (input: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ message: string }>;
  updatePassword: (password: string) => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_NAMES: Record<UserRole, string> = {
  admin: "Administrador",
  leader: "Lider de Posto",
  attendant: "Manobrista",
  cashier: "Caixa",
};

function snapshotAuth() {
  return {
    session: localDb.getSession(),
    user: localDb.getCurrentUser(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUsers, setHasUsers] = useState(false);

  const refreshUser = async () => {
    const next = snapshotAuth();
    setSession(next.session);
    setUser(next.user);
  };

  useEffect(() => {
    const sync = () => {
      const next = snapshotAuth();
      setSession(next.session);
      setUser(next.user);
      setHasUsers(localDb.hasUsers());
      setLoading(false);
    };

    sync();
    return localDb.subscribe(sync);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signIn: async (email, password) => {
        setLoading(true);
        try {
          await localDb.signIn(email, password);
          await refreshUser();
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {
        await localDb.signOut();
        await refreshUser();
      },
      refreshUser,
      hasUsers,
      registerFirstUser: async (input) => {
        setLoading(true);
        try {
          await localDb.registerFirstUser(input);
          await refreshUser();
        } finally {
          setLoading(false);
        }
      },
      requestPasswordReset: async (email) => localDb.requestPasswordReset(email),
      updatePassword: async (password) => {
        await localDb.updatePassword(password);
      },
      can: (permission) => (user?.role ? hasPermission(user.role, permission) : false),
    }),
    [hasUsers, loading, session, user],
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

export function getRoleDisplayName(role: UserRole | null | undefined): string {
  if (!role) {
    return "Sem perfil";
  }

  return ROLE_NAMES[role];
}
