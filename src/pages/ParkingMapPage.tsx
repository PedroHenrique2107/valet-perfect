import { Layers, RefreshCw, Settings } from "lucide-react";
import { ParkingMap } from "@/components/dashboard/ParkingMap";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useParkingSpotsQuery } from "@/hooks/useValetData";

export default function ParkingMapPage() {
  const { data: parkingSpots = [] } = useParkingSpotsQuery();

  const stats = {
    total: parkingSpots.length,
    available: parkingSpots.filter((spot) => spot.status === "available").length,
    occupied: parkingSpots.filter((spot) => spot.status === "occupied").length,
    reserved: parkingSpots.filter((spot) => spot.status === "reserved").length,
    maintenance: parkingSpots.filter((spot) => spot.status === "maintenance").length,
  };

  const occupancyRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mapa do Pátio</h1>
            <p className="text-muted-foreground">Visualização em tempo real das vagas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Layers className="h-4 w-4" />
              Pisos
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total de Vagas</p>
          </div>
          <div className="stat-card border-l-4 border-l-success text-center">
            <p className="text-3xl font-bold text-success">{stats.available}</p>
            <p className="text-sm text-muted-foreground">Disponíveis</p>
          </div>
          <div className="stat-card border-l-4 border-l-destructive text-center">
            <p className="text-3xl font-bold text-destructive">{stats.occupied}</p>
            <p className="text-sm text-muted-foreground">Ocupadas</p>
          </div>
          <div className="stat-card border-l-4 border-l-info text-center">
            <p className="text-3xl font-bold text-info">{stats.reserved}</p>
            <p className="text-sm text-muted-foreground">Reservadas</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-foreground">{occupancyRate}%</p>
            <p className="text-sm text-muted-foreground">Taxa de Ocupação</p>
          </div>
        </div>

        <ParkingMap spots={parkingSpots} />
      </div>
    </MainLayout>
  );
}
