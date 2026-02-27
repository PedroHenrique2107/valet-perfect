import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEFAULT_UNIT_NAME } from "@/config/pricing";
import { formatCurrencyBRL, formatDateTimeBR, formatDurationMinutes } from "@/lib/format";
import type { Attendant, Transaction, Vehicle } from "@/types/valet";

interface VehicleDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  attendants: Attendant[];
  transactions: Transaction[];
}

const contractLabel: Record<string, string> = {
  hourly: "Avulso por hora",
  daily: "Diaria",
  monthly: "Mensalista",
  agreement: "Convenio",
};

const statusLabel: Record<string, string> = {
  parked: "Estacionado",
  requested: "Solicitado",
  in_transit: "Em transito",
  delivered: "Entregue",
  reserved: "Reservado",
};

export function VehicleDetailsDialog({
  open,
  onOpenChange,
  vehicle,
  attendants,
  transactions,
}: VehicleDetailsDialogProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open || !vehicle || vehicle.status === "delivered") {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, vehicle]);

  const attendantName = useMemo(() => {
    if (!vehicle) return "-";
    return attendants.find((item) => item.id === vehicle.attendantId)?.name ?? "Nao identificado";
  }, [attendants, vehicle]);

  const vehicleTx = useMemo(() => {
    if (!vehicle) return [];
    return transactions
      .filter((tx) => tx.vehicleId === vehicle.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [transactions, vehicle]);

  if (!vehicle) {
    return null;
  }

  const finalTime = vehicle.exitTime?.getTime() ?? now;
  const totalMinutes = Math.max(0, Math.floor((finalTime - vehicle.entryTime.getTime()) / 60000));
  const latestTx = vehicleTx[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Veiculo</DialogTitle>
          <DialogDescription>Resumo operacional e financeiro do registro.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="Placa" value={vehicle.plate} />
          <Field label="Cliente" value={vehicle.clientName} />
          <Field label="Telefone" value={vehicle.clientPhone || "-"} />
          <Field label="Tipo de contrato" value={contractLabel[vehicle.contractType ?? "hourly"]} />
          <Field label="Unidade (Nome do patio)" value={vehicle.unitName ?? DEFAULT_UNIT_NAME} />
          <Field label="Operador que recebeu" value={attendantName} />
          <Field label="Data/hora de entrada" value={formatDateTimeBR(vehicle.entryTime)} />
          <Field label="Status atual" value={statusLabel[vehicle.status]} />
          <Field label="Tempo total no patio (live)" value={formatDurationMinutes(totalMinutes)} />
        </div>

        <section className="space-y-2">
          <h4 className="font-semibold">Historico de troca de vaga</h4>
          <div className="rounded-lg border p-3 text-sm">
            {vehicle.spotHistory && vehicle.spotHistory.length > 0 ? (
              <div className="space-y-2">
                {vehicle.spotHistory.map((entry, index) => (
                  <p key={`${entry.spotId}-${entry.changedAt.getTime()}-${index}`}>
                    {entry.spotId} - {formatDateTimeBR(entry.changedAt)} - {entry.changedBy}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Sem historico de troca de vaga.</p>
            )}
          </div>
        </section>

        {vehicle.status === "delivered" && (
          <section className="space-y-2">
            <h4 className="font-semibold">Informacoes financeiras</h4>
            <div className="grid grid-cols-1 gap-3 rounded-lg border p-3 text-sm sm:grid-cols-2">
              <Field label="Tipo de cobranca" value={vehicle.contractType ? contractLabel[vehicle.contractType] : "-"} />
              <Field
                label="Valor acumulado ate o momento"
                value={latestTx ? formatCurrencyBRL(latestTx.amount) : formatCurrencyBRL(0)}
              />
              <Field label="Tabela aplicada" value={vehicle.pricing?.tableName ?? "-"} />
              <Field label="Cortesias aplicadas" value={vehicle.pricing?.courtesyApplied ?? "Sem cortesia"} />
              <Field label="Pagamento" value={latestTx ? latestTx.paymentMethod.toUpperCase() : "-"} />
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
