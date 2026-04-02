import { Loader2 } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, session, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Validando acesso...
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && (!user.role || !allowedRoles.includes(user.role))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">Acesso negado</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Seu usuario esta autenticado, mas ainda nao possui permissao para esta area.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              Voltar para home
            </Button>
            <Button variant="outline" onClick={() => void signOut()}>
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
