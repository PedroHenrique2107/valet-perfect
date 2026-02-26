import { Car, Clock, MapPin, MoreVertical, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDurationFromDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/types/valet";

interface VehicleStatusCardProps {
  vehicle: Vehicle;
  className?: string;
  canRequest?: boolean;
  canRegisterExit?: boolean;
  onRequestVehicle?: (vehicle: Vehicle) => void;
  onRegisterExit?: (vehicle: Vehicle) => void;
}

const statusConfig = {
  parked: { label: "Estacionado", className: "status-available", dotColor: "bg-success" },
  requested: { label: "Solicitado", className: "status-busy", dotColor: "bg-warning animate-pulse" },
  in_transit: { label: "Em Trânsito", className: "status-reserved", dotColor: "bg-info animate-pulse" },
  delivered: { label: "Entregue", className: "status-available", dotColor: "bg-success" },
  reserved: { label: "Reservado", className: "status-reserved", dotColor: "bg-info" },
};

export function VehicleStatusCard({
  vehicle,
  className,
  canRequest = true,
  canRegisterExit = true,
  onRequestVehicle,
  onRegisterExit,
}: VehicleStatusCardProps) {
  const status = statusConfig[vehicle.status];

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-lg",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Car className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-mono text-lg font-bold text-foreground">{vehicle.plate}</h3>
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
            <DropdownMenuItem disabled={!canRequest} onClick={() => onRequestVehicle?.(vehicle)}>
              Solicitar veículo
            </DropdownMenuItem>
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem>Ver vistoria</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              disabled={!canRegisterExit}
              onClick={() => onRegisterExit?.(vehicle)}
            >
              Registrar saída
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Badge variant="outline" className={cn("flex items-center gap-1.5", status.className)}>
          <span className={cn("h-2 w-2 rounded-full", status.dotColor)} />
          {status.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatDurationFromDate(vehicle.entryTime)}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="font-mono">{vehicle.spotId}</span>
        </div>
        <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          <span className="truncate">{vehicle.clientName}</span>
        </div>
      </div>

      {vehicle.status === "requested" && (
        <div className="mt-3 border-t border-border pt-3">
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

      {vehicle.observations?.toLowerCase().includes("vip") && (
        <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-xl bg-warning px-2 py-1 text-xs font-bold text-warning-foreground">
          VIP
        </div>
      )}
    </div>
  );
}
