import { useEffect, useMemo, useState } from "react";
import { Car, CircleDollarSign, Clock, MapPin, MoreVertical, Phone, Send, User } from "lucide-react";
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
  parked: { label: "Estacionado", className: "bg-success/20 text-success border-success/40", dotColor: "bg-success" },
  requested: { label: "Solicitado", className: "bg-warning/20 text-warning border-warning/40", dotColor: "bg-warning" },
  in_transit: { label: "Solicitado", className: "bg-warning/20 text-warning border-warning/40", dotColor: "bg-warning" },
  delivered: { label: "Entregue", className: "bg-info/20 text-info border-info/40", dotColor: "bg-info" },
  reserved: { label: "Reservado", className: "bg-muted text-muted-foreground border-border", dotColor: "bg-muted-foreground" },
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
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [vehicle.status]);

  const totalSeconds = useMemo(() => {
    const startTime =
      vehicle.status === "requested" || vehicle.status === "in_transit"
        ? vehicle.requestedAt ?? vehicle.entryTime
        : vehicle.entryTime;
    const end = vehicle.exitTime?.getTime() ?? now;
    return Math.max(0, Math.floor((end - startTime.getTime()) / 1000));
  }, [now, vehicle.entryTime, vehicle.exitTime, vehicle.requestedAt, vehicle.status]);

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
            <p className="text-xs text-muted-foreground truncate">
              {vehicle.model} - {vehicle.clientName}
              {vehicle.driverName ? ` | ${vehicle.driverName}` : ""}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs">{contractLabel[vehicle.contractType ?? "hourly"]}</span>
              {vehicle.vipRequired ? (
                <span className="inline-flex items-center rounded bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-warning-foreground">
                  VIP
                </span>
              ) : null}
              {vehicle.linkedClientId ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    vehicle.billingStatusAtEntry === "current"
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive",
                  )}
                >
                  {vehicle.billingStatusAtEntry === "current" ? "Em dia" : "Vencido"}
                </span>
              ) : null}
              {vehicle.prepaidPaid ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <CircleDollarSign className="h-3 w-3" />
                  Pago antecipado
                </span>
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
        {vehicle.driverName ? (
          <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span className="truncate">Condutor: {vehicle.driverName}</span>
          </div>
        ) : null}
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

      {(vehicle.vipRequired || vehicle.observations?.toLowerCase().includes("vip")) && (
        <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">
          VIP
        </div>
      )}
    </div>
  );
}
