import { Car, Clock3, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatMinutesHuman,
  getStatusLabel,
  getWorkedMinutes,
  getWorkloadLevel,
} from "@/lib/attendantMetrics";
import { cn } from "@/lib/utils";
import type { Attendant } from "@/types/valet";

interface AttendantCardProps {
  attendant: Attendant;
  className?: string;
  onViewDetails?: (attendant: Attendant) => void;
}

const statusConfig = {
  online: { className: "status-available", dotColor: "bg-success" },
  lunch: { className: "status-busy", dotColor: "bg-warning" },
  dinner: { className: "status-busy", dotColor: "bg-warning" },
  commuting: { className: "status-busy", dotColor: "bg-info animate-pulse" },
  offline: {
    className: "bg-muted text-muted-foreground border-muted",
    dotColor: "bg-muted-foreground",
  },
};

export function AttendantCard({ attendant, className, onViewDetails }: AttendantCardProps) {
  const status = statusConfig[attendant.status];
  const workedMinutes = getWorkedMinutes(attendant);
  const workload = getWorkloadLevel(attendant);

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/50",
        workload === "exceeded" && "border-destructive/60",
        !attendant.isOnline && "opacity-80",
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-border">
            <AvatarImage src={attendant.photo} alt={attendant.name} />
            <AvatarFallback>{attendant.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card",
              status.dotColor,
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{attendant.name}</h3>
          <Badge variant="outline" className={cn("mt-1 text-xs", status.className)}>
            {getStatusLabel(attendant.status)}
          </Badge>
          <p className="mt-1 text-xs text-muted-foreground">
            Periodo: {attendant.workPeriodStart} - {attendant.workPeriodEnd}
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-warning">
            <Star className="h-3.5 w-3.5 fill-warning" />
            <span className="text-sm font-bold">{attendant.rating.toFixed(1)}</span>
          </div>
          <p className="text-[10px] uppercase text-muted-foreground">Avaliacao</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-info">
            <Clock3 className="h-3.5 w-3.5" />
            <span
              className={cn(
                "font-mono text-sm font-bold",
                workload === "exceeded" && "text-destructive",
              )}
            >
              {formatMinutesHuman(workedMinutes)}
            </span>
          </div>
          <p className="text-[10px] uppercase text-muted-foreground">Tempo Trabalhado</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-success">
            <Car className="h-3.5 w-3.5" />
            <span className="text-sm font-bold">{attendant.vehiclesHandledToday}</span>
          </div>
          <p className="text-[10px] uppercase text-muted-foreground">Veiculos</p>
        </div>
      </div>

      {onViewDetails && (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onViewDetails(attendant)}>
          Ver detalhes
        </Button>
      )}

      <div className="absolute right-2 top-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
          {attendant.shift === "morning" && "MANHA"}
          {attendant.shift === "afternoon" && "TARDE"}
          {attendant.shift === "night" && "NOITE"}
        </span>
      </div>
    </div>
  );
}
