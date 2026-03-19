import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Wallet } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { useCurrentCashSessionQuery } from "@/hooks/useValetData";
import { isSupabaseConfigured } from "@/services/service-utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: currentCashSession, isLoading } = useCurrentCashSessionQuery();
  const shouldBlock = isSupabaseConfigured() && !isLoading && !currentCashSession && location.pathname !== "/cash";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        {children}
        {shouldBlock ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/88 p-6 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl border border-warning/30 bg-card p-8 text-center shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/15">
                <AlertTriangle className="h-7 w-7 text-warning" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-foreground">Caixa fechado</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                As operacoes do sistema ficam bloqueadas ate que um usuario responsavel realize a abertura do caixa.
              </p>
              <div className="mt-6 flex justify-center">
                <Button className="gap-2" onClick={() => navigate("/cash")}>
                  <Wallet className="h-4 w-4" />
                  Ir para abertura de caixa
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
