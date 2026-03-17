import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MapPin,
  Receipt,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getRoleDisplayName, useAuth } from "@/contexts/AuthContext";
import { useVehiclesQuery } from "@/hooks/useValetData";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
  comingSoon?: boolean;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Car, label: "Veiculos", href: "/vehicles" },
  { icon: Users, label: "Manobristas", href: "/attendants" },
  { icon: MapPin, label: "Mapa do Patio", href: "/parking-map" },
  { icon: Receipt, label: "Financeiro", href: "/financial" },
  { icon: UserCircle, label: "Clientes", href: "/clients" },
  { icon: BarChart3, label: "Relatorios", href: "/reports", comingSoon: true },
  { icon: Calendar, label: "Eventos", href: "/events", comingSoon: true },
];

const bottomNavItems: NavItem[] = [
  { icon: Bell, label: "Notificacoes", href: "/notifications", badge: 5, comingSoon: true },
  { icon: Settings, label: "Configuracoes", href: "/settings", comingSoon: true },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { data: vehicles = [] } = useVehiclesQuery();
  const parkedVehiclesCount = vehicles.filter((vehicle) => vehicle.status === "parked").length;

  const resolvedMainNavItems = mainNavItems.map((item) =>
    item.href === "/vehicles" ? { ...item, badge: parkedVehiclesCount } : item,
  );

  const NavItemLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />
        {!collapsed && (
          <span className={cn("text-sm font-medium", item.comingSoon && "line-through decoration-2")}>
            {item.label}
          </span>
        )}
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={cn(
              "absolute flex items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground",
              collapsed ? "right-0 top-0 h-4 w-4 text-[10px]" : "right-3 h-5 min-w-5 px-1.5",
            )}
          >
            {item.badge}
          </span>
        )}
        {isActive && <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.comingSoon ? `${item.label} (nao criado)` : item.label}
            {item.badge !== undefined && ` (${item.badge})`}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-primary">
            <Car className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-foreground">ValetTracker</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sistema de Gestao</span>
            </div>
          )}
        </Link>
      </div>

      {!collapsed && (
        <div className="border-b border-sidebar-border px-3 py-4">
          <button className="flex w-full items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 transition-colors hover:bg-muted">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Shopping Center Norte</p>
              <p className="text-xs text-muted-foreground">Sao Paulo, SP</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {resolvedMainNavItems.map((item) => (
          <NavItemLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border px-3 py-4">
        {bottomNavItems.map((item) => (
          <NavItemLink key={item.href} item={item} />
        ))}
      </div>

      <div className="border-t border-sidebar-border px-3 py-4">
        <div
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50",
            collapsed && "justify-center px-0",
          )}
        >
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name ?? "User")}`} />
            <AvatarFallback>{(user?.name ?? "U").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium">{user?.name ?? "Usuário"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email ?? "Sem e-mail"}</p>
              <p className="truncate text-xs text-muted-foreground">{getRoleDisplayName(user?.role)}</p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-md hover:bg-muted"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
    </aside>
  );
}
