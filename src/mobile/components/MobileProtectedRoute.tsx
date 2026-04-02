import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface MobileProtectedRouteProps {
  children: React.ReactNode;
}

export function MobileProtectedRoute({ children }: MobileProtectedRouteProps) {
  const { loading, session, user, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando operacao mobile...
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return <Navigate to="/m/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== "attendant") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900/90 p-6 text-white shadow-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-200/70">Mobile attendant</p>
          <h1 className="mt-4 text-2xl font-semibold">Acesso restrito</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Esta experiencia mobile foi preparada apenas para o perfil de manobrista.
          </p>
          <Button className="mt-6 w-full" variant="secondary" onClick={() => void signOut()}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
