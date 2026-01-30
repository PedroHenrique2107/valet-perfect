import { MainLayout } from '@/components/layout/MainLayout';
import { ParkingMap } from '@/components/dashboard/ParkingMap';
import { mockParkingSpots } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Settings, Layers, RefreshCw } from 'lucide-react';

export default function ParkingMapPage() {
  const stats = {
    total: mockParkingSpots.length,
    available: mockParkingSpots.filter((s) => s.status === 'available').length,
    occupied: mockParkingSpots.filter((s) => s.status === 'occupied').length,
    reserved: mockParkingSpots.filter((s) => s.status === 'reserved').length,
    maintenance: mockParkingSpots.filter((s) => s.status === 'maintenance').length,
  };

  const occupancyRate = Math.round((stats.occupied / stats.total) * 100);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mapa do Pátio</h1>
            <p className="text-muted-foreground">
              Visualização em tempo real das vagas
            </p>
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

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total de Vagas</p>
          </div>
          <div className="stat-card text-center border-l-4 border-l-success">
            <p className="text-3xl font-bold text-success">{stats.available}</p>
            <p className="text-sm text-muted-foreground">Disponíveis</p>
          </div>
          <div className="stat-card text-center border-l-4 border-l-destructive">
            <p className="text-3xl font-bold text-destructive">{stats.occupied}</p>
            <p className="text-sm text-muted-foreground">Ocupadas</p>
          </div>
          <div className="stat-card text-center border-l-4 border-l-info">
            <p className="text-3xl font-bold text-info">{stats.reserved}</p>
            <p className="text-sm text-muted-foreground">Reservadas</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-foreground">{occupancyRate}%</p>
            <p className="text-sm text-muted-foreground">Taxa de Ocupação</p>
          </div>
        </div>

        {/* Map */}
        <ParkingMap spots={mockParkingSpots} />
      </div>
    </MainLayout>
  );
}
