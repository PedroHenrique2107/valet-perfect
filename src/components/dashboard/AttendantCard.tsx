import { Car, MessageCircle, Star, Timer } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Attendant } from "@/types/valet";

interface AttendantCardProps {
  attendant: Attendant;
  className?: string;
  canAssignTask?: boolean;
  onAssignTask?: (attendant: Attendant) => void;
}

const statusConfig = {
  available: { label: "Disponível", className: "status-available", dotColor: "bg-success" },
  busy: { label: "Ocupado", className: "status-busy", dotColor: "bg-warning animate-pulse" },
  break: { label: "Intervalo", className: "status-occupied", dotColor: "bg-muted-foreground" },
  offline: {
    label: "Offline",
    className: "bg-muted text-muted-foreground border-muted",
    dotColor: "bg-muted-foreground",
  },
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function AttendantCard({ attendant, className, canAssignTask = true, onAssignTask }: AttendantCardProps) {
  const status = statusConfig[attendant.status];

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/50",
        !attendant.isOnline && "opacity-60",
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
            {status.label}
          </Badge>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-warning">
            <Star className="h-3.5 w-3.5 fill-warning" />
            <span className="text-sm font-bold">{attendant.rating.toFixed(1)}</span>
          </div>
          <p className="text-[10px] uppercase text-muted-foreground">Avaliação</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-info">
            <Timer className="h-3.5 w-3.5" />
            <span className="font-mono text-sm font-bold">{formatTime(attendant.avgServiceTime)}</span>
          </div>
          <p className="text-[10px] uppercase text-muted-foreground">Tempo Médio</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-success">
            <Car className="h-3.5 w-3.5" />
            <span className="text-sm font-bold">{attendant.vehiclesHandled}</span>
          </div>
          <p className="text-[10px] uppercase text-muted-foreground">Veículos</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={!attendant.isOnline}>
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
          Mensagem
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-primary text-xs hover:bg-primary/90"
          disabled={attendant.status !== "available" || !canAssignTask}
          onClick={() => onAssignTask?.(attendant)}
        >
          Atribuir Tarefa
        </Button>
      </div>

      <div className="absolute right-2 top-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
          {attendant.shift === "morning" && "Manhã"}
          {attendant.shift === "afternoon" && "Tarde"}
          {attendant.shift === "night" && "Noite"}
        </span>
      </div>
    </div>
  );
}
