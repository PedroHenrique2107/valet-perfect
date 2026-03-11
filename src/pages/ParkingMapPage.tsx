import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Layers,
  Plus,
  RefreshCw,
  Settings,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { ParkingMap } from "@/components/dashboard/ParkingMap";
import { ParkingSpotConfigDialog } from "@/components/forms/ParkingSpotConfigDialog";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useMoveParkingSpotMutation,
  useParkingSpotsQuery,
  useUpdateParkingSpotConfigMutation,
  useVehiclesQuery,
} from "@/hooks/useValetData";
import type { ParkingSpot } from "@/types/valet";

const statusLabels: Record<ParkingSpot["status"], string> = {
  available: "Disponivel",
  occupied: "Ocupadas",
  maintenance: "Manutencao",
  blocked: "Bloqueadas",
};

const typeLabels: Record<ParkingSpot["type"], string> = {
  regular: "Regular",
  vip: "Credenciado / VIP",
  accessible: "Cadeirante",
  electric: "Eletrico",
  motorcycle: "Moto",
};

export default function ParkingMapPage() {
  const { data: parkingSpots = [], refetch, isFetching } = useParkingSpotsQuery();
  const { data: vehicles = [] } = useVehiclesQuery();
  const moveParkingSpot = useMoveParkingSpotMutation();
  const updateParkingSpotConfig = useUpdateParkingSpotConfigMutation();
  const { toast } = useToast();

  const [showFloorControls, setShowFloorControls] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<ParkingSpot["status"] | "all">("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const floorOptions = useMemo(
    () => Array.from(new Set(parkingSpots.map((spot) => spot.floor))).sort((left, right) => left - right),
    [parkingSpots],
  );

  const sectionOptions = useMemo(() => {
    const source =
      selectedFloor === "all"
        ? parkingSpots
        : parkingSpots.filter((spot) => spot.floor === Number(selectedFloor));
    return Array.from(new Set(source.map((spot) => spot.section))).sort((left, right) => left.localeCompare(right));
  }, [parkingSpots, selectedFloor]);

  const filteredSpots = useMemo(() => {
    return parkingSpots.filter((spot) => {
      const matchesFloor = selectedFloor === "all" || spot.floor === Number(selectedFloor);
      const matchesStatus = selectedStatus === "all" || spot.status === selectedStatus;
      const matchesSection = selectedSection === "all" || spot.section === selectedSection;
      return matchesFloor && matchesStatus && matchesSection;
    });
  }, [parkingSpots, selectedFloor, selectedSection, selectedStatus]);

  const stats = {
    total: filteredSpots.length,
    available: filteredSpots.filter((spot) => spot.status === "available").length,
    occupied: filteredSpots.filter((spot) => spot.status === "occupied").length,
    maintenance: filteredSpots.filter((spot) => spot.status === "maintenance").length,
    blocked: filteredSpots.filter((spot) => spot.status === "blocked").length,
  };

  const occupancyRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;
  const selectedSpot = parkingSpots.find((spot) => spot.id === selectedSpotId) ?? null;
  const selectedVehicle = selectedSpot?.vehicleId
    ? vehicles.find((vehicle) => vehicle.id === selectedSpot.vehicleId) ?? null
    : null;

  useEffect(() => {
    if (!filteredSpots.length) {
      setSelectedSpotId(null);
      return;
    }

    if (!selectedSpotId || !filteredSpots.some((spot) => spot.id === selectedSpotId)) {
      setSelectedSpotId(filteredSpots[0].id);
    }
  }, [filteredSpots, selectedSpotId]);

  useEffect(() => {
    if (selectedSection !== "all" && !sectionOptions.includes(selectedSection)) {
      setSelectedSection("all");
    }
  }, [sectionOptions, selectedSection]);

  const alerts = useMemo(() => {
    const list: { id: string; title: string; description: string; icon: typeof AlertTriangle }[] = [];
    const occupancyThreshold = 80;
    const maintenanceThreshold = 25;

    const sectionGroups = parkingSpots.reduce((acc, spot) => {
      const key = `${spot.floor}-${spot.section}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(spot);
      return acc;
    }, {} as Record<string, ParkingSpot[]>);

    Object.entries(sectionGroups).forEach(([key, spots]) => {
      const occupied = spots.filter((spot) => spot.status === "occupied").length;
      const operational = spots.filter((spot) => spot.status !== "maintenance" && spot.status !== "blocked").length;
      const maintenance = spots.filter((spot) => spot.status === "maintenance").length;
      const vipOccupied = spots.filter((spot) => spot.type === "vip" && spot.status === "occupied").length;
      const vipAvailable = spots.filter((spot) => spot.type === "vip" && spot.status === "available").length;
      const [floor, section] = key.split("-");
      const occupancy = operational > 0 ? Math.round((occupied / operational) * 100) : 0;
      const maintenanceRate = spots.length > 0 ? Math.round((maintenance / spots.length) * 100) : 0;

      if (occupancy >= occupancyThreshold) {
        list.push({
          id: `${key}-occupancy`,
          title: `Ocupacao alta na secao ${section}`,
          description: `Piso ${floor} com ${occupancy}% das vagas operacionais ocupadas.`,
          icon: AlertTriangle,
        });
      }

      if (maintenanceRate >= maintenanceThreshold) {
        list.push({
          id: `${key}-maintenance`,
          title: `Excesso de manutencao na secao ${section}`,
          description: `Piso ${floor} com ${maintenanceRate}% das vagas indisponiveis por manutencao.`,
          icon: Wrench,
        });
      }

      if (vipOccupied > 0 && vipAvailable === 0) {
        list.push({
          id: `${key}-vip-demand`,
          title: `Conflito entre vagas VIP e demanda real`,
          description: `Piso ${floor} / secao ${section} sem folga para credenciados ou VIP.`,
          icon: ShieldAlert,
        });
      }
    });

    return list.slice(0, 6);
  }, [parkingSpots]);

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Mapa atualizado",
      description: "Os dados do patio foram recarregados.",
    });
  };

  const handleOpenConfig = () => {
    if (!selectedSpot) {
      toast({
        title: "Selecione uma vaga",
        description: "Escolha uma vaga no mapa antes de editar.",
        variant: "destructive",
      });
      return;
    }
    setConfigOpen(true);
  };

  const handleToggleBlock = async () => {
    if (!selectedSpot) return;

    if (selectedSpot.vehicleId || selectedSpot.status === "occupied") {
      toast({
        title: "Acao nao permitida",
        description: "Nao e possivel bloquear ou desbloquear uma vaga ocupada.",
        variant: "destructive",
      });
      return;
    }

    const nextStatus = selectedSpot.status === "blocked" ? "available" : "blocked";
    await updateParkingSpotConfig.mutateAsync({
      spotId: selectedSpot.id,
      code: selectedSpot.code,
      floor: selectedSpot.floor,
      section: selectedSpot.section,
      type: selectedSpot.type,
      status: nextStatus,
      usageRule: selectedSpot.usageRule,
      capacity: selectedSpot.capacity,
      observations: selectedSpot.observations,
    });

    toast({
      title: nextStatus === "blocked" ? "Vaga bloqueada" : "Vaga desbloqueada",
      description: `${selectedSpot.code} agora esta ${nextStatus === "blocked" ? "bloqueada" : "disponivel"}.`,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mapa do Patio</h1>
            <p className="text-muted-foreground">
              Gestao visual do patio com alertas, criacao, edicao, bloqueio e arraste entre secoes
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button
              variant={showFloorControls ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setShowFloorControls((current) => !current)}
            >
              <Layers className="h-4 w-4" />
              Pisos
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova vaga
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenConfig}>
              <Settings className="h-4 w-4" />
              Editar
            </Button>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <div key={alert.id} className="stat-card border-l-4 border-l-warning">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-warning/15 p-2 text-warning">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{alert.title}</p>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showFloorControls && (
          <div className="stat-card space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedFloor === "all" ? "default" : "outline"}
                onClick={() => setSelectedFloor("all")}
              >
                Todos os pisos
              </Button>
              {floorOptions.map((floor) => (
                <Button
                  key={floor}
                  size="sm"
                  variant={selectedFloor === String(floor) ? "default" : "outline"}
                  onClick={() => setSelectedFloor(String(floor))}
                >
                  Piso {floor}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => setSelectedStatus(value as ParkingSpot["status"] | "all")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Secao</p>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as secoes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as secoes</SelectItem>
                    {sectionOptions.map((section) => (
                      <SelectItem key={section} value={section}>
                        Secao {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumo do filtro</p>
                <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  {selectedFloor === "all" ? "Todos os pisos" : `Piso ${selectedFloor}`} •{" "}
                  {selectedSection === "all" ? "Todas as secoes" : `Secao ${selectedSection}`} •{" "}
                  {selectedStatus === "all" ? "Todos os status" : statusLabels[selectedStatus]}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <SummaryCard title="Vagas no filtro" value={stats.total} />
          <SummaryCard title="Disponiveis" value={stats.available} accent="success" />
          <SummaryCard title="Ocupadas" value={stats.occupied} accent="destructive" />
          <SummaryCard title="Manutencao" value={stats.maintenance} accent="warning" />
          <SummaryCard title="Bloqueadas" value={stats.blocked} accent="default" subtitle={`${occupancyRate}% ocupacao`} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <ParkingMap
            spots={filteredSpots}
            selectedSpotId={selectedSpotId ?? undefined}
            onSpotSelect={(spot) => setSelectedSpotId(spot.id)}
            onSpotMove={(spot, target) => {
              moveParkingSpot.mutate(
                { spotId: spot.id, floor: target.floor, section: target.section },
                {
                  onSuccess: () => {
                    toast({
                      title: "Vaga reposicionada",
                      description: `${spot.code} movida para piso ${target.floor} / secao ${target.section}.`,
                    });
                  },
                },
              );
            }}
            title="Mapa do Patio"
            subtitle="Clique para selecionar e arraste a vaga para reorganizar por piso e secao"
          />

          <div className="stat-card h-fit space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Detalhes da vaga</h2>
                <p className="text-sm text-muted-foreground">
                  Edite, bloqueie ou acompanhe o historico completo da vaga selecionada.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleToggleBlock} disabled={!selectedSpot}>
                  {selectedSpot?.status === "blocked" ? "Desbloquear" : "Bloquear"}
                </Button>
                <Button size="sm" variant="outline" onClick={handleOpenConfig} disabled={!selectedSpot}>
                  Editar
                </Button>
              </div>
            </div>

            {selectedSpot ? (
              <div className="space-y-3 text-sm">
                <Field label="Codigo" value={selectedSpot.code} />
                <Field label="Piso" value={String(selectedSpot.floor)} />
                <Field label="Secao" value={selectedSpot.section} />
                <Field label="Tipo" value={typeLabels[selectedSpot.type]} />
                <Field label="Status" value={statusLabels[selectedSpot.status]} />
                <Field label="Capacidade" value={String(selectedSpot.capacity ?? 1)} />
                <Field label="Regra de uso" value={selectedSpot.usageRule ?? "Operacao geral"} />
                <Field label="Observacoes" value={selectedSpot.observations ?? "Sem observacoes"} />
                <Field label="Veiculo vinculado" value={selectedVehicle?.plate ?? "Nenhum"} />
                <Field label="Cliente" value={selectedVehicle?.clientName ?? "Sem cliente associado"} />

                <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Historico completo
                  </p>
                  <div className="mt-3 space-y-2">
                    {(selectedSpot.history ?? []).length > 0 ? (
                      selectedSpot.history?.map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-border/40 px-3 py-2">
                          <p className="font-medium text-foreground">{entry.action}</p>
                          <p className="text-muted-foreground">{entry.details}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.changedAt.toLocaleDateString("pt-BR")} {entry.changedAt.toLocaleTimeString("pt-BR")} • {entry.changedBy}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">Nenhuma alteracao registrada.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                Nenhuma vaga selecionada no filtro atual.
              </div>
            )}
          </div>
        </div>
      </div>

      <ParkingSpotConfigDialog open={configOpen} onOpenChange={setConfigOpen} spot={selectedSpot} mode="edit" />
      <ParkingSpotConfigDialog open={createOpen} onOpenChange={setCreateOpen} spot={null} mode="create" />
    </MainLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  accent = "default",
  subtitle,
}: {
  title: string;
  value: number;
  accent?: "default" | "success" | "destructive" | "warning";
  subtitle?: string;
}) {
  const accentClass =
    accent === "success"
      ? "border-l-success"
      : accent === "destructive"
        ? "border-l-destructive"
        : accent === "warning"
          ? "border-l-warning"
          : "border-l-border";

  return (
    <div className={`stat-card border-l-4 ${accentClass} text-center`}>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{title}</p>
      {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
