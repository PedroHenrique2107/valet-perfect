import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hasPermission } from "@/auth/permissions";
import { mockDb, type MockSession } from "@/data/mockDb";
import type { Permission, SessionUser, UserRole } from "@/types/auth";

interface AuthContextValue {
  user: SessionUser | null;
  session: MockSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetMockDb: () => Promise<void>;
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
    session: mockDb.getSession(),
    user: mockDb.getCurrentUser(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<MockSession | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    };

    sync();
    return mockDb.subscribe(sync);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signIn: async (email, password) => {
        setLoading(true);
        try {
          await mockDb.signIn(email, password);
          await refreshUser();
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {
        await mockDb.signOut();
        await refreshUser();
      },
      refreshUser,
      resetMockDb: async () => {
        mockDb.reset();
        await refreshUser();
      },
      requestPasswordReset: async (email) => mockDb.requestPasswordReset(email),
      updatePassword: async (password) => {
        await mockDb.updatePassword(password);
      },
      can: (permission) => (user?.role ? hasPermission(user.role, permission) : false),
    }),
    [loading, session, user],
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
