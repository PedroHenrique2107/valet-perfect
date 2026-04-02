import { useMemo, useState } from "react";
import { CircleDot, Plus, Search } from "lucide-react";
import { VehicleDetailsDialog } from "@/components/forms/VehicleDetailsDialog";
import { VehicleEntryDialog } from "@/components/forms/VehicleEntryDialog";
import { VehicleExitDialog } from "@/components/forms/VehicleExitDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCan } from "@/contexts/AuthContext";
import { useAttendantsQuery, useParkingSpotsQuery, useRequestVehicleMutation, useTransactionsQuery, useVehiclesQuery } from "@/hooks/useValetData";
import { formatDurationFromDate, formatTimeBR } from "@/lib/format";
import { getParkingSpotLabel } from "@/lib/parking-spots";
import { MobileShell } from "@/mobile/components/MobileShell";
import type { Vehicle, VehicleStatus } from "@/types/valet";

const statusOptions: Array<{ value: VehicleStatus | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "parked", label: "No patio" },
  { value: "requested", label: "Solicitados" },
  { value: "in_transit", label: "Em deslocamento" },
  { value: "delivered", label: "Entregues" },
];

export default function MobileVehiclesPage() {
  const { data: vehicles = [] } = useVehiclesQuery();
  const { data: attendants = [] } = useAttendantsQuery();
  const { data: parkingSpots = [] } = useParkingSpotsQuery();
  const { data: transactions = [] } = useTransactionsQuery();
  const canCreateVehicle = useCan("create_vehicle");
  const canRegisterExit = useCan("register_exit");
  const requestVehicle = useRequestVehicleMutation();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VehicleStatus | "all">("all");
  const [entryOpen, setEntryOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const filteredVehicles = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const matchesStatus = status === "all" || vehicle.status === status;
      const matchesSearch =
        normalized.length === 0 ||
        vehicle.plate.toLowerCase().includes(normalized) ||
        vehicle.clientName.toLowerCase().includes(normalized) ||
        vehicle.model.toLowerCase().includes(normalized);

      return matchesStatus && matchesSearch;
    });
  }, [search, status, vehicles]);

  return (
    <MobileShell title="Veiculos" subtitle="Entrada, consulta e retirada com foco no celular">
      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar placa, cliente ou modelo"
              className="h-11 rounded-2xl border-slate-200 pl-10"
            />
          </div>
          <Button
            className="h-11 rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-800"
            onClick={() => setEntryOpen(true)}
            disabled={!canCreateVehicle}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                status === option.value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {filteredVehicles.length > 0 ? (
          filteredVehicles.map((vehicle) => {
            const spotLabel = getParkingSpotLabel(parkingSpots, vehicle.spotId);
            const isWaiting = vehicle.status === "requested" || vehicle.status === "in_transit";

            return (
              <article key={vehicle.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{vehicle.plate}</p>
                    <p className="text-sm text-slate-500">
                      {vehicle.brand} {vehicle.model}
                    </p>
                  </div>
                  <StatusBadge status={vehicle.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <InfoChip label="Cliente" value={vehicle.clientName} />
                  <InfoChip label="Vaga" value={spotLabel} />
                  <InfoChip label="Entrada" value={formatTimeBR(vehicle.entryTime)} />
                  <InfoChip label="Permanencia" value={formatDurationFromDate(vehicle.entryTime)} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setDetailsOpen(true);
                    }}
                  >
                    Detalhes
                  </Button>

                  {isWaiting ? (
                    <Button className="rounded-2xl bg-amber-500 text-white hover:bg-amber-600" disabled>
                      Em atendimento
                    </Button>
                  ) : (
                    <Button
                      className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                      onClick={() => requestVehicle.mutate(vehicle.id)}
                    >
                      Solicitar
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="col-span-2 rounded-2xl"
                    disabled={!canRegisterExit}
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setExitOpen(true);
                    }}
                  >
                    Registrar saida
                  </Button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Nenhum veiculo encontrado com o filtro atual.
          </div>
        )}
      </section>

      <VehicleEntryDialog open={entryOpen} onOpenChange={setEntryOpen} />
      <VehicleExitDialog open={exitOpen} onOpenChange={setExitOpen} initialVehicleId={selectedVehicle?.id} />
      <VehicleDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        vehicle={selectedVehicle}
        attendants={attendants}
        transactions={transactions}
      />
    </MobileShell>
  );
}

function StatusBadge({ status }: { status: VehicleStatus }) {
  const styles: Record<VehicleStatus, string> = {
    parked: "bg-emerald-100 text-emerald-700",
    requested: "bg-amber-100 text-amber-700",
    in_transit: "bg-sky-100 text-sky-700",
    delivered: "bg-slate-200 text-slate-700",
    reserved: "bg-violet-100 text-violet-700",
  };

  const labels: Record<VehicleStatus, string> = {
    parked: "No patio",
    requested: "Solicitado",
    in_transit: "Em deslocamento",
    delivered: "Entregue",
    reserved: "Reservado",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      <CircleDot className="h-3 w-3" />
      {labels[status]}
    </span>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 line-clamp-2 font-medium text-slate-700">{value}</p>
    </div>
  );
}
