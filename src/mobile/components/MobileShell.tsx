import { CarFront, House, LayoutGrid, LogOut, UserCircle2 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getRoleDisplayName, useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/m", label: "Inicio", icon: House },
  { href: "/m/vehicles", label: "Veiculos", icon: CarFront },
  { href: "/m/patio", label: "Patio", icon: LayoutGrid },
  { href: "/m/profile", label: "Perfil", icon: UserCircle2 },
];

interface MobileShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function MobileShell({ title, subtitle, children }: MobileShellProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#020617_0%,#0f172a_16%,#f8fafc_16%,#f8fafc_100%)]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 px-4 pb-5 pt-[calc(env(safe-area-inset-top)+1rem)] text-white backdrop-blur">
        <div className="mx-auto flex max-w-md items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-200/70">Operacao mobile</p>
            <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white"
            onClick={() => void signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="mx-auto mt-4 max-w-md rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-sm font-medium text-white">{user?.name ?? "Manobrista"}</p>
          <p className="text-xs text-slate-300">{getRoleDisplayName(user?.role)}</p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4 pb-28">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/96 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium transition",
                  isActive ? "bg-slate-950 text-white shadow-lg" : "text-slate-500",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
