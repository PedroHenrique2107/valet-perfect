import { useState } from "react";
import { Car, Grid3X3, List, Plus, Search, Trash2 } from "lucide-react";
import { COMPANY_NAME, DEFAULT_UNIT_NAME } from "@/config/pricing";
import { VehicleStatusCard } from "@/components/dashboard/VehicleStatusCard";
import { VehicleDetailsDialog } from "@/components/forms/VehicleDetailsDialog";
import { VehicleEntryDialog } from "@/components/forms/VehicleEntryDialog";
import { VehicleExitDialog } from "@/components/forms/VehicleExitDialog";
import { VehicleInspectionDialog } from "@/components/forms/VehicleInspectionDialog";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCan } from "@/contexts/AuthContext";
import {
  useAttendantsQuery,
  useClearAllVehiclesMutation,
  useRequestVehicleMutation,
  useTransactionsQuery,
  useVehiclesQuery,
} from "@/hooks/useValetData";
import { filterVehicles } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import type { Vehicle, VehicleStatus } from "@/types/valet";

const statusFilters: { value: VehicleStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "parked", label: "Estacionados" },
  { value: "requested", label: "Solicitados" },
  { value: "reserved", label: "Reservados" },
  { value: "delivered", label: "Entregues" },
];

export default function VehiclesPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">("all");
  const [entryOpen, setEntryOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const canCreateVehicle = useCan("create_vehicle");
  const canRegisterExit = useCan("register_exit");

  const { data: vehicles = [] } = useVehiclesQuery();
  const { data: attendants = [] } = useAttendantsQuery();
  const { data: transactions = [] } = useTransactionsQuery();
  const requestVehicle = useRequestVehicleMutation();
  const clearAllVehicles = useClearAllVehiclesMutation();

  const filteredVehicles = filterVehicles(vehicles, searchQuery, statusFilter);

  const statusCounts = {
    all: vehicles.length,
    parked: vehicles.filter((vehicle) => vehicle.status === "parked").length,
    requested: vehicles.filter((vehicle) => vehicle.status === "requested" || vehicle.status === "in_transit").length,
    reserved: vehicles.filter((vehicle) => vehicle.status === "reserved").length,
    delivered: vehicles.filter((vehicle) => vehicle.status === "delivered").length,
  };

  const sendSmsToClient = (vehicle: Vehicle) => {
    if (!vehicle.clientPhone) return;

    const phone = vehicle.clientPhone.replace(/\D/g, "");
    const message = `${COMPANY_NAME} - ${DEFAULT_UNIT_NAME}: Seu veiculo ja esta disponivel para retirada. Estamos aguardando voce!`;
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, "_self");
  };

  return (
    <MainLayout>
      <div className="space-y-4 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Veiculos</h1>
            <p className="text-muted-foreground">Gerencie todos os veiculos no estacionamento</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
              disabled={vehicles.length === 0 || clearAllVehicles.isPending}
              onClick={() => clearAllVehicles.mutate()}
            >
              <Trash2 className="h-4 w-4" />
              Limpar carros (teste)
            </Button>
            <Button
              className="gap-2 bg-gradient-primary hover:opacity-90"
              onClick={() => setEntryOpen(true)}
              disabled={!canCreateVehicle}
            >
              <Plus className="h-4 w-4" />
              Nova Entrada
            </Button>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, cliente ou modelo..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn("gap-2", statusFilter === filter.value && "bg-primary")}
                >
                  {filter.label}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "h-5 min-w-5 justify-center",
                      statusFilter === filter.value
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted",
                    )}
                  >
                    {statusCounts[filter.value]}
                  </Badge>
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", viewMode === "grid" && "bg-background shadow-sm")}
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", viewMode === "list" && "bg-background shadow-sm")}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {filteredVehicles.length > 0 ? (
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-2">
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "space-y-2",
              )}
            >
              {filteredVehicles.map((vehicle) => (
                <VehicleStatusCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  canRequest={canCreateVehicle}
                  canRegisterExit={canRegisterExit}
                  onRequestVehicle={(item) => requestVehicle.mutate(item.id)}
                  onSendSms={sendSmsToClient}
                  onViewDetails={(item) => {
                    setSelectedVehicle(item);
                    setDetailsOpen(true);
                  }}
                  onViewInspection={(item) => {
                    setSelectedVehicle(item);
                    setInspectionOpen(true);
                  }}
                  onRegisterExit={(item) => {
                    setSelectedVehicle(item);
                    setExitOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="stat-card flex flex-col items-center justify-center py-16">
            <Car className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold text-foreground">Nenhum veiculo encontrado</h3>
            <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou realizar uma nova busca</p>
          </div>
        )}
      </div>

      <VehicleEntryDialog open={entryOpen} onOpenChange={setEntryOpen} />
      <VehicleExitDialog open={exitOpen} onOpenChange={setExitOpen} initialVehicleId={selectedVehicle?.id} />
      <VehicleDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        vehicle={selectedVehicle}
        attendants={attendants}
        transactions={transactions}
      />
      <VehicleInspectionDialog open={inspectionOpen} onOpenChange={setInspectionOpen} vehicle={selectedVehicle} />
    </MainLayout>
  );
}
