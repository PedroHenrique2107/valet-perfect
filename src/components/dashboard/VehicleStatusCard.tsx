import { cn } from '@/lib/utils';
import { Vehicle } from '@/types/valet';
import { Clock, MapPin, User, Phone, MoreVertical, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VehicleStatusCardProps {
  vehicle: Vehicle;
  className?: string;
}

const statusConfig = {
  parked: {
    label: 'Estacionado',
    className: 'status-available',
    dotColor: 'bg-success',
  },
  requested: {
    label: 'Solicitado',
    className: 'status-busy',
    dotColor: 'bg-warning animate-pulse',
  },
  in_transit: {
    label: 'Em Trânsito',
    className: 'status-reserved',
    dotColor: 'bg-info animate-pulse',
  },
  delivered: {
    label: 'Entregue',
    className: 'status-available',
    dotColor: 'bg-success',
  },
  reserved: {
    label: 'Reservado',
    className: 'status-reserved',
    dotColor: 'bg-info',
  },
};

function formatDuration(entryTime: Date): string {
  const now = new Date();
  const diff = now.getTime() - entryTime.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

export function VehicleStatusCard({ vehicle, className }: VehicleStatusCardProps) {
  const status = statusConfig[vehicle.status];

  return (
    <div
      className={cn(
        'relative rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-lg',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Car className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-foreground font-mono text-lg">{vehicle.plate}</h3>
            <p className="text-sm text-muted-foreground">
              {vehicle.brand} {vehicle.model} • {vehicle.color}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Solicitar veículo</DropdownMenuItem>
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem>Ver vistoria</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Registrar saída</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline" className={cn('flex items-center gap-1.5', status.className)}>
          <span className={cn('h-2 w-2 rounded-full', status.dotColor)} />
          {status.label}
        </Badge>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatDuration(vehicle.entryTime)}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="font-mono">{vehicle.spotId}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground col-span-2">
          <User className="h-4 w-4" />
          <span className="truncate">{vehicle.clientName}</span>
        </div>
      </div>

      {/* Client Phone (on hover/action) */}
      {vehicle.status === 'requested' && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-warning">
              <Phone className="h-4 w-4" />
              <span>{vehicle.clientPhone}</span>
            </div>
            <Button size="sm" className="bg-gradient-accent hover:opacity-90">
              Buscar
            </Button>
          </div>
        </div>
      )}

      {/* VIP Indicator */}
      {vehicle.observations?.toLowerCase().includes('vip') && (
        <div className="absolute top-0 right-0 px-2 py-1 bg-warning text-warning-foreground text-xs font-bold rounded-bl-lg rounded-tr-xl">
          VIP
        </div>
      )}
    </div>
  );
}
