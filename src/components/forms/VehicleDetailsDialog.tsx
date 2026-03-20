import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParkingSpotsQuery, useUpdateVehicleSpotMutation } from "@/hooks/useValetData";
import { useAppSettings } from "@/lib/app-settings";
import { formatCurrencyBRL, formatDateTimeBR, formatDurationPrecise } from "@/lib/format";
import { findParkingSpotByIdentifier, getParkingSpotLabel } from "@/lib/parking-spots";
import type { Attendant, Transaction, Vehicle } from "@/types/valet";

interface VehicleDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  attendants: Attendant[];
  transactions: Transaction[];
}

const contractLabel: Record<string, string> = {
  hourly: "Avulso",
  daily: "Avulso",
  monthly: "Mensalista",
  agreement: "Credenciado",
};

const paymentLabel: Record<string, string> = {
  pix: "PIX",
  credit: "Credito",
  debit: "Debito",
  cash: "Dinheiro",
  monthly: "Mensalista",
};

const statusLabel: Record<string, string> = {
  parked: "Estacionado",
  requested: "Solicitado",
  in_transit: "Solicitado",
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
  const [selectedSpot, setSelectedSpot] = useState("");
  const { data: parkingSpots = [] } = useParkingSpotsQuery();
  const updateVehicleSpot = useUpdateVehicleSpotMutation();
  const settings = useAppSettings();

  useEffect(() => {
    if (!open || !vehicle || vehicle.status === "delivered") return;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [open, vehicle]);

  useEffect(() => {
    if (!vehicle) return;
    setSelectedSpot(findParkingSpotByIdentifier(parkingSpots, vehicle.spotId)?.id ?? vehicle.spotId);
  }, [parkingSpots, vehicle]);

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

  if (!vehicle) return null;

  const startTime =
    vehicle.status === "requested" || vehicle.status === "in_transit"
      ? vehicle.requestedAt ?? vehicle.entryTime
      : vehicle.entryTime;
  const finalTime = vehicle.exitTime?.getTime() ?? now;
  const totalSeconds = Math.max(0, Math.floor((finalTime - startTime.getTime()) / 1000));
  const latestTx = vehicleTx[0];
  const currentSpot = findParkingSpotByIdentifier(parkingSpots, vehicle.spotId);
  const selectableSpots = parkingSpots
    .filter((spot) => spot.status === "available" || spot.id === currentSpot?.id)
    .sort((a, b) => a.code.localeCompare(b.code));

  const inspectionOkList = vehicle.inspection
    ? [
        vehicle.inspection.leftSide && "Lado esquerdo",
        vehicle.inspection.rightSide && "Lado direito",
        vehicle.inspection.frontBumper && "Para-choque dianteiro",
        vehicle.inspection.rearBumper && "Para-choque traseiro",
        vehicle.inspection.wheels && "Rodas",
        vehicle.inspection.mirrors && "Retrovisores",
        vehicle.inspection.roof && "Teto",
        vehicle.inspection.windows && "Vidros",
        vehicle.inspection.interior && "Interior",
      ].filter(Boolean)
    : [];

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
          <Field
            label="Tipo de contrato"
            value={contractLabel[vehicle.contractType ?? "hourly"]}
            strikethrough={vehicle.contractType === "monthly"}
          />
          <Field label="Unidade (Nome do patio)" value={vehicle.unitName ?? settings.unitName} />
          <Field label="Operador que recebeu" value={attendantName} />
          <Field label="Data/hora de entrada" value={formatDateTimeBR(vehicle.entryTime)} />
          <Field label="Status atual" value={statusLabel[vehicle.status]} />
          <Field label="Tempo total no patio (live)" value={formatDurationPrecise(totalSeconds)} />
          <Field label="Pagamento antecipado" value={vehicle.prepaidPaid ? "Sim" : "Nao"} />
        </div>

        <section className="space-y-2">
          <h4 className="font-semibold">Editar vaga atual</h4>
          <div className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto]">
            <Select value={selectedSpot} onValueChange={setSelectedSpot} disabled={vehicle.status === "delivered"}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a vaga" />
              </SelectTrigger>
              <SelectContent>
                {selectableSpots.map((spot) => (
                  <SelectItem key={spot.id} value={spot.id}>
                    {spot.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              disabled={vehicle.status === "delivered" || selectedSpot === (currentSpot?.id ?? vehicle.spotId) || updateVehicleSpot.isPending}
              onClick={() => updateVehicleSpot.mutate({ vehicleId: vehicle.id, spotId: selectedSpot })}
            >
              {updateVehicleSpot.isPending ? "Salvando..." : "Salvar vaga"}
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="font-semibold">Historico de troca de vaga</h4>
          <div className="rounded-lg border p-3 text-sm">
            {vehicle.spotHistory && vehicle.spotHistory.length > 0 ? (
              <div className="space-y-2">
                {vehicle.spotHistory.map((entry, index) => (
                  <p key={`${entry.spotId}-${entry.changedAt.getTime()}-${index}`}>
                    {getParkingSpotLabel(parkingSpots, entry.spotId)} - {formatDateTimeBR(entry.changedAt)} - {entry.changedBy}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Sem historico de troca de vaga.</p>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="font-semibold">Vistoria (itens positivos)</h4>
          <div className="rounded-lg border p-3 text-sm">
            {inspectionOkList.length > 0 ? (
              <p>{inspectionOkList.join(", ")}</p>
            ) : (
              <p className="text-muted-foreground">Sem vistoria registrada.</p>
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
              <Field
                label="Pagamento"
                value={latestTx ? paymentLabel[latestTx.paymentMethod] ?? latestTx.paymentMethod : "-"}
                strikethrough={latestTx?.paymentMethod === "monthly"}
              />
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, strikethrough = false }: { label: string; value: string; strikethrough?: boolean }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium ${strikethrough ? "line-through" : ""}`}>{value}</p>
    </div>
  );
}
