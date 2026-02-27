import { useEffect, useMemo, useState } from "react";
import { Car, Clock, MapPin, MoreVertical, Phone, Send, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDurationPrecise } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/types/valet";

interface VehicleStatusCardProps {
  vehicle: Vehicle;
  className?: string;
  canRequest?: boolean;
  canRegisterExit?: boolean;
  onRequestVehicle?: (vehicle: Vehicle) => void;
  onRegisterExit?: (vehicle: Vehicle) => void;
  onViewDetails?: (vehicle: Vehicle) => void;
  onViewInspection?: (vehicle: Vehicle) => void;
  onSendSms?: (vehicle: Vehicle) => void;
}

const statusConfig = {
  parked: { label: "Estacionado", className: "bg-blue-100 text-blue-700 border-blue-300", dotColor: "bg-blue-500" },
  requested: { label: "Solicitado", className: "bg-amber-100 text-amber-700 border-amber-300", dotColor: "bg-amber-500" },
  in_transit: { label: "Solicitado", className: "bg-amber-100 text-amber-700 border-amber-300", dotColor: "bg-amber-500" },
  delivered: { label: "Entregue", className: "bg-emerald-100 text-emerald-700 border-emerald-300", dotColor: "bg-emerald-500" },
  reserved: { label: "Reservado", className: "bg-pink-100 text-pink-700 border-pink-300", dotColor: "bg-pink-500" },
};

const contractLabel: Record<string, string> = {
  hourly: "Avulso",
  daily: "Avulso",
  agreement: "Credenciado",
  monthly: "Mensalista",
};

export function VehicleStatusCard({
  vehicle,
  className,
  canRequest = true,
  canRegisterExit = true,
  onRequestVehicle,
  onRegisterExit,
  onViewDetails,
  onViewInspection,
  onSendSms,
}: VehicleStatusCardProps) {
  const status = statusConfig[vehicle.status];
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (vehicle.status === "delivered") {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [vehicle.status]);

  const totalSeconds = useMemo(() => {
    const end = vehicle.exitTime?.getTime() ?? now;
    return Math.max(0, Math.floor((end - vehicle.entryTime.getTime()) / 1000));
  }, [now, vehicle.entryTime, vehicle.exitTime]);

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:border-primary/50 hover:shadow-lg",
        className,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <div className="rounded-md bg-muted p-1.5">
            <Car className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="font-mono text-base font-bold text-foreground truncate">{vehicle.plate}</h3>
            <p className="text-xs text-muted-foreground truncate">{vehicle.model} - {vehicle.clientName}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={cn("text-xs", vehicle.contractType === "monthly" && "line-through")}>{contractLabel[vehicle.contractType ?? "hourly"]}</span>
              {vehicle.hasSemParar ? (
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">SemParar</span>
              ) : null}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={!canRequest} onClick={() => onRequestVehicle?.(vehicle)}>
              Solicitar veiculo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewDetails?.(vehicle)}>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewInspection?.(vehicle)}>Ver vistoria</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              disabled={!canRegisterExit}
              onClick={() => onRegisterExit?.(vehicle)}
            >
              Registrar saida
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className={cn("flex items-center gap-1.5 border", status.className)}>
          <span className={cn("h-2 w-2 rounded-full", status.dotColor)} />
          {status.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDurationPrecise(totalSeconds)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="font-mono">{vehicle.spotId}</span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span className="truncate">{vehicle.clientName}</span>
        </div>
      </div>

      {vehicle.status === "requested" && (
        <div className="mt-2 border-t border-border pt-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <Phone className="h-3.5 w-3.5" />
              <span>{vehicle.clientPhone}</span>
            </div>
            <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onSendSms?.(vehicle)}>
              <Send className="h-3 w-3" />
              Buscar
            </Button>
          </div>
        </div>
      )}

      {vehicle.observations?.toLowerCase().includes("vip") && (
        <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">
          VIP
        </div>
      )}
    </div>
  );
}
