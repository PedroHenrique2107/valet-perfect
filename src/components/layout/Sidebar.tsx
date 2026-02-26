import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Car,
  Users,
  MapPin,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  BarChart3,
  Calendar,
  Bell,
  LogOut,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Car, label: 'Veículos', href: '/vehicles', badge: 6 },
  { icon: Users, label: 'Manobristas', href: '/attendants' },
  { icon: MapPin, label: 'Mapa do Pátio', href: '/parking-map' },
  { icon: Receipt, label: 'Financeiro', href: '/financial' },
  { icon: UserCircle, label: 'Clientes', href: '/clients' },
  { icon: BarChart3, label: 'Relatórios', href: '/reports' },
  { icon: Calendar, label: 'Eventos', href: '/events' },
];

const bottomNavItems: NavItem[] = [
  { icon: Bell, label: 'Notificações', href: '/notifications', badge: 5 },
  { icon: Settings, label: 'Configurações', href: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
        {!collapsed && (
          <span className="font-medium text-sm">{item.label}</span>
        )}
        {item.badge && item.badge > 0 && (
          <span
            className={cn(
              'absolute flex items-center justify-center text-xs font-bold rounded-full bg-primary text-primary-foreground',
              collapsed
                ? 'top-0 right-0 h-4 w-4 text-[10px]'
                : 'right-3 h-5 min-w-5 px-1.5'
            )}
          >
            {item.badge}
          </span>
        )}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
            {item.badge && ` (${item.badge})`}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        'h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 relative',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
            <Car className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-foreground">ValetTracker</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Sistema de Gestão
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Location Selector */}
      {!collapsed && (
        <div className="px-3 py-4 border-b border-sidebar-border">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Shopping Center Norte</p>
              <p className="text-xs text-muted-foreground">São Paulo, SP</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* User Profile */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer',
            collapsed && 'justify-center px-0'
          )}
        >
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Pedro</p>
              <p className="text-xs text-muted-foreground truncate">Administrador</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-sidebar border border-sidebar-border shadow-md hover:bg-muted"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  );
}
