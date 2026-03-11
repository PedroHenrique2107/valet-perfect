import { useMemo, useState } from "react";
import {
  Accessibility,
  Bike,
  Car,
  Crown,
  Lock,
  Wrench,
  Zap,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { sortSectionsByOrder } from "@/lib/parkingLayout";
import { cn } from "@/lib/utils";
import type { ParkingSpot } from "@/types/valet";

interface ParkingMapProps {
  spots: ParkingSpot[];
  className?: string;
  title?: string;
  subtitle?: string;
  selectedSpotId?: string;
  onSpotSelect?: (spot: ParkingSpot) => void;
  onSpotMove?: (spot: ParkingSpot, target: Pick<ParkingSpot, "floor" | "section">) => void;
  onSpotEdit?: (spot: ParkingSpot) => void;
  onSpotStatus?: (spot: ParkingSpot) => void;
  onSpotDelete?: (spot: ParkingSpot) => void;
  floorFilterValue?: string;
  floorOptions?: number[];
  onFloorFilterChange?: (value: string) => void;
  sectionOrder?: string[];
}

const spotTypeIcons = {
  regular: Car,
  vip: Crown,
  accessible: Accessibility,
  electric: Zap,
  motorcycle: Bike,
};

const statusLabels = {
  available: "Disponivel",
  occupied: "Ocupada",
  maintenance: "Manutencao",
  blocked: "Bloqueada",
};

const typeLabels = {
  regular: "Regular",
  vip: "Credenciado / VIP",
  accessible: "Cadeirante",
  electric: "Eletrico",
  motorcycle: "Moto",
};

function getSpotClasses(spot: ParkingSpot) {
  if (spot.status === "occupied") {
    return "bg-destructive/20 border-destructive/70 text-destructive";
  }

  if (spot.status === "maintenance") {
    return "bg-slate-800/80 border-slate-500 text-slate-200";
  }

  if (spot.status === "blocked") {
    return "bg-slate-900/80 border-slate-600 text-slate-300";
  }

  if (spot.type === "vip") {
    return "bg-white/10 border-white/80 text-white";
  }

  if (spot.type === "electric") {
    return "bg-warning/15 border-warning/80 text-warning";
  }

  if (spot.type === "accessible") {
    return "bg-info/15 border-info/80 text-info";
  }

  return "bg-success/15 border-success/70 text-success";
}

function getSpotShortCode(code: string) {
  const segments = code.split("-");
  return segments[segments.length - 1] ?? code;
}

export function ParkingMap({
  spots,
  className,
  title = "Mapa do Patio",
  subtitle = "Visao em tempo real das vagas",
  selectedSpotId,
  onSpotSelect,
  onSpotMove,
  onSpotEdit,
  onSpotStatus,
  onSpotDelete,
  floorFilterValue = "all",
  floorOptions = [],
  onFloorFilterChange,
  sectionOrder = [],
}: ParkingMapProps) {
  const [draggedSpotId, setDraggedSpotId] = useState<string | null>(null);
  const grouped = useMemo(() => {
    return spots.reduce((acc, spot) => {
      if (!acc[spot.floor]) {
        acc[spot.floor] = {};
      }
      if (!acc[spot.floor][spot.section]) {
        acc[spot.floor][spot.section] = [];
      }
      acc[spot.floor][spot.section].push(spot);
      return acc;
    }, {} as Record<number, Record<string, ParkingSpot[]>>);
  }, [spots]);

  const stats = {
    available: spots.filter((spot) => spot.status === "available").length,
    occupied: spots.filter((spot) => spot.status === "occupied").length,
    maintenance: spots.filter((spot) => spot.status === "maintenance").length,
    vip: spots.filter((spot) => spot.status === "available" && spot.type === "vip").length,
    electric: spots.filter((spot) => spot.status === "available" && spot.type === "electric").length,
    accessible: spots.filter((spot) => spot.status === "available" && spot.type === "accessible").length,
  };

  return (
    <div className={cn("stat-card", className)}>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {onFloorFilterChange ? (
            <div className="w-full max-w-xs">
              <Select value={floorFilterValue} onValueChange={onFloorFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os pisos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pisos</SelectItem>
                  {floorOptions.map((floor) => (
                    <SelectItem key={floor} value={String(floor)}>
                      Piso {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          <LegendDot className="border-success/70 bg-success/15 text-success" label={`Disponivel (${stats.available})`} />
          <LegendDot className="border-destructive/70 bg-destructive/20 text-destructive" label={`Ocupada (${stats.occupied})`} />
          <LegendDot className="border-slate-500 bg-slate-800/80 text-slate-200" label={`Manutencao (${stats.maintenance})`} />
          <LegendDot className="border-white/80 bg-white/10 text-white" label={`Credenciado/VIP (${stats.vip})`} />
          <LegendDot className="border-warning/80 bg-warning/15 text-warning" label={`Eletrico (${stats.electric})`} />
          <LegendDot className="border-info/80 bg-info/15 text-info" label={`Cadeirante (${stats.accessible})`} />
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(grouped)
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([floor, sections]) => (
            <div key={floor} className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-semibold uppercase tracking-wider text-foreground/90">Piso {floor}</h4>
                <span className="text-sm text-muted-foreground">
                  {Object.values(sections).flat().length} vaga(s)
                </span>
              </div>

              {Object.entries(sections)
                .sort(([left], [right]) => {
                  const sorted = sortSectionsByOrder([left, right], sectionOrder);
                  return sorted.indexOf(left) - sorted.indexOf(right);
                })
                .map(([section, sectionSpots]) => (
                  <div
                    key={`${floor}-${section}`}
                    className="space-y-3 rounded-xl border border-border/30 bg-background/20 p-4"
                    onDragOver={(event) => {
                      if (!onSpotMove) return;
                      event.preventDefault();
                    }}
                    onDrop={() => {
                      if (!draggedSpotId || !onSpotMove) return;
                      const draggedSpot = spots.find((spot) => spot.id === draggedSpotId);
                      if (!draggedSpot) return;
                      onSpotMove(draggedSpot, { floor: Number(floor), section });
                      setDraggedSpotId(null);
                    }}
                  >
                    <h5 className="text-lg font-semibold uppercase tracking-wider text-foreground/85">
                      Secao {section}
                    </h5>

                    <div className="grid grid-cols-4 gap-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                      {[...sectionSpots]
                        .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
                        .map((spot) => {
                          const Icon = spotTypeIcons[spot.type];
                          const isSelected = selectedSpotId === spot.id;

                          return (
                            <Tooltip key={spot.id}>
                              <ContextMenu>
                                <ContextMenuTrigger asChild>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      draggable={Boolean(onSpotMove)}
                                      onDragStart={() => {
                                        if (!onSpotMove) return;
                                        setDraggedSpotId(spot.id);
                                      }}
                                      onDragEnd={() => setDraggedSpotId(null)}
                                      className={cn(
                                        "relative flex aspect-[1.2/1] flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition-all duration-200 hover:scale-[1.02]",
                                        onSpotMove ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                                        getSpotClasses(spot),
                                        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                                      )}
                                      onClick={() => onSpotSelect?.(spot)}
                                    >
                                      <Icon className="h-5 w-5" />
                                      <span className="font-mono text-sm font-semibold">
                                        {getSpotShortCode(spot.code)}
                                      </span>
                                      {spot.status === "maintenance" && (
                                        <Wrench className="absolute -right-1 -top-1 h-3.5 w-3.5 text-warning" />
                                      )}
                                      {spot.status === "blocked" && (
                                        <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 text-slate-300" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                </ContextMenuTrigger>
                                <ContextMenuContent className="w-40">
                                  <ContextMenuItem onClick={() => onSpotEdit?.(spot)}>
                                    Editar vaga
                                  </ContextMenuItem>
                                  <ContextMenuItem onClick={() => onSpotStatus?.(spot)}>
                                    Status
                                  </ContextMenuItem>
                                  <ContextMenuSeparator />
                                  <ContextMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => onSpotDelete?.(spot)}
                                  >
                                    Excluir vaga
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                              <TooltipContent side="top">
                                <div className="text-sm">
                                  <p className="font-semibold">{spot.code}</p>
                                  <p className="text-muted-foreground">
                                    Piso {spot.floor} • Secao {spot.section}
                                  </p>
                                  <p className="text-muted-foreground">{typeLabels[spot.type]}</p>
                                  <p className="font-medium">{statusLabels[spot.status]}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                    </div>
                  </div>
                ))}
            </div>
          ))}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-md border", className)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
