import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { mockVehicles } from '@/data/mockData';
import { VehicleStatusCard } from '@/components/dashboard/VehicleStatusCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, Grid3X3, List, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleStatus } from '@/types/valet';

const statusFilters: { value: VehicleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'parked', label: 'Estacionados' },
  { value: 'requested', label: 'Solicitados' },
  { value: 'in_transit', label: 'Em Trânsito' },
  { value: 'reserved', label: 'Reservados' },
];

export default function VehiclesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all');

  const filteredVehicles = mockVehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: mockVehicles.length,
    parked: mockVehicles.filter((v) => v.status === 'parked').length,
    requested: mockVehicles.filter((v) => v.status === 'requested').length,
    in_transit: mockVehicles.filter((v) => v.status === 'in_transit').length,
    reserved: mockVehicles.filter((v) => v.status === 'reserved').length,
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Veículos</h1>
            <p className="text-muted-foreground">
              Gerencie todos os veículos no estacionamento
            </p>
          </div>
          <Button className="bg-gradient-primary hover:opacity-90 gap-2">
            <Plus className="h-4 w-4" />
            Nova Entrada
          </Button>
        </div>

        {/* Filters */}
        <div className="stat-card">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, cliente, marca ou modelo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn(
                    'gap-2',
                    statusFilter === filter.value && 'bg-primary'
                  )}
                >
                  {filter.label}
                  <Badge
                    variant="secondary"
                    className={cn(
                      'h-5 min-w-5 justify-center',
                      statusFilter === filter.value
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {statusCounts[filter.value]}
                  </Badge>
                </Button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-8 p-0',
                  viewMode === 'grid' && 'bg-background shadow-sm'
                )}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-8 p-0',
                  viewMode === 'list' && 'bg-background shadow-sm'
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Vehicles Grid/List */}
        {filteredVehicles.length > 0 ? (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            )}
          >
            {filteredVehicles.map((vehicle) => (
              <VehicleStatusCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        ) : (
          <div className="stat-card flex flex-col items-center justify-center py-16">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Nenhum veículo encontrado
            </h3>
            <p className="text-sm text-muted-foreground">
              Tente ajustar os filtros ou realizar uma nova busca
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
