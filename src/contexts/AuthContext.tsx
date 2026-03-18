import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { hasPermission } from "@/auth/permissions";
import { supabase } from "@/integrations/supabase/client";
import type { Permission, SessionUser, UserRole } from "@/types/auth";

interface AuthContextValue {
  user: SessionUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_NAMES: Record<UserRole, string> = {
  admin: "Administrador",
  leader: "Lider de Posto",
  attendant: "Manobrista",
  cashier: "Caixa",
};

interface ProfileRow {
  full_name?: string | null;
}

interface UserUnitRoleRow {
  role?: string | null;
  unit_id?: string | null;
}

function isKnownRole(value: string | null | undefined): value is UserRole {
  return value === "admin" || value === "leader" || value === "attendant" || value === "cashier";
}

function buildSessionUser(authUser: User, overrides?: Partial<SessionUser>): SessionUser {
  const fallbackName =
    typeof authUser.user_metadata?.full_name === "string"
      ? authUser.user_metadata.full_name
      : typeof authUser.user_metadata?.name === "string"
        ? authUser.user_metadata.name
        : authUser.email || "Usuario";
  const fallbackRole = isKnownRole(authUser.app_metadata?.role) ? authUser.app_metadata.role : null;

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name: fallbackName,
    role: fallbackRole,
    unitId: null,
    ...overrides,
  };
}

async function loadSessionUser(session: Session | null): Promise<SessionUser | null> {
  const authUser = session?.user;
  if (!authUser) {
    return null;
  }

  const fallbackUser = buildSessionUser(authUser);
  let profileName = fallbackUser.name;
  let roleFromDb: UserRole | null = fallbackUser.role;
  let unitId: string | null = null;

  const [profileResult, roleResult] = await Promise.allSettled([
    supabase.from("profiles").select("full_name").eq("id", authUser.id).maybeSingle<ProfileRow>(),
    supabase
      .from("user_unit_roles")
      .select("role, unit_id")
      .eq("user_id", authUser.id)
      .limit(1)
      .maybeSingle<UserUnitRoleRow>(),
  ]);

  if (profileResult.status === "fulfilled" && profileResult.value.data?.full_name) {
    profileName = profileResult.value.data.full_name;
  }

  if (roleResult.status === "fulfilled") {
    const roleRow = roleResult.value.data;
    if (isKnownRole(roleRow?.role)) {
      roleFromDb = roleRow.role;
    }
    unitId = roleRow?.unit_id ?? null;
  }

  return buildSessionUser(authUser, {
    name: profileName || fallbackUser.email || "Usuario",
    role: roleFromDb,
    unitId,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);
      setUser(await loadSessionUser(currentSession));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const syncAuthState = async (nextSession: Session | null) => {
      if (!mounted) {
        return;
      }

      setLoading(true);
      setSession(nextSession);

      try {
        const nextUser = await loadSessionUser(nextSession);
        if (mounted) {
          setUser(nextUser);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const bootstrap = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      await syncAuthState(currentSession);
    };

    void bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncAuthState(nextSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshUser,
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
