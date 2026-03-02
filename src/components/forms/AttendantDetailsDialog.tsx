import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getPerformanceLabel, getStatusLabel, getWorkedMinutes, getWorkLimitMinutes } from "@/lib/attendantMetrics";
import { cn } from "@/lib/utils";
import type { Attendant } from "@/types/valet";

interface AttendantDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendant: Attendant | null;
}

function formatServiceTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatMinutesAsHours(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function AttendantDetailsDialog({ open, onOpenChange, attendant }: AttendantDetailsDialogProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [open]);

  const workedMinutes = useMemo(() => (attendant ? getWorkedMinutes(attendant, now) : 0), [attendant, now]);
  const workLimitMinutes = useMemo(
    () => (attendant ? getWorkLimitMinutes(attendant) : 0),
    [attendant],
  );

  if (!attendant) return null;

  const isExceeded = workedMinutes > workLimitMinutes;
  const performance = getPerformanceLabel(attendant);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Manobrista</DialogTitle>
          <DialogDescription>Dados operacionais e de jornada do colaborador.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="Colaborador" value={attendant.name} />
          <Field label="Status" value={getStatusLabel(attendant.status)} />
          <Field label="Total de veiculos no dia" value={String(attendant.vehiclesHandledToday)} />
          <Field label="Tempo medio" value={formatServiceTime(attendant.avgServiceTime)} />
          <Field label="Performance" value={performance} />
          <Field label="Patio/Estacionamento atual" value={attendant.parkingName} />
          <Field label="Avaliacao" value={attendant.rating.toFixed(1)} />
          <Field label="Periodo cadastrado" value={`${attendant.workPeriodStart} - ${attendant.workPeriodEnd}`} />
          <Field
            label="Tempo de trabalho estabelecido"
            value={`${formatMinutesAsHours(workedMinutes)} de ${attendant.maxWorkHours}h`}
            className={cn(isExceeded && "text-destructive font-semibold")}
          />
          {isExceeded && (
            <Badge variant="destructive" className="w-fit">
              Jornada excedida: atencao imediata
            </Badge>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-medium", className)}>{value}</p>
    </div>
  );
}
