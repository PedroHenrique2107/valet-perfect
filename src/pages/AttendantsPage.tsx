import { MainLayout } from '@/components/layout/MainLayout';
import { mockAttendants } from '@/data/mockData';
import { AttendantCard } from '@/components/dashboard/AttendantCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { AttendantStatus } from '@/types/valet';

const shiftFilters = [
  { value: 'all', label: 'Todos os Turnos' },
  { value: 'morning', label: 'Manhã' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'night', label: 'Noite' },
];

export default function AttendantsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState('all');

  const filteredAttendants = mockAttendants.filter((attendant) => {
    const matchesSearch = attendant.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesShift =
      shiftFilter === 'all' || attendant.shift === shiftFilter;

    return matchesSearch && matchesShift;
  });

  const onlineCount = mockAttendants.filter((a) => a.isOnline).length;
  const availableCount = mockAttendants.filter((a) => a.status === 'available').length;
  const busyCount = mockAttendants.filter((a) => a.status === 'busy').length;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manobristas</h1>
            <p className="text-muted-foreground">
              Gerencie sua equipe de manobristas
            </p>
          </div>
          <Button className="bg-gradient-primary hover:opacity-90 gap-2">
            <Plus className="h-4 w-4" />
            Novo Manobrista
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10">
              <Users className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{onlineCount}</p>
              <p className="text-sm text-muted-foreground">Online agora</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{availableCount}</p>
              <p className="text-sm text-muted-foreground">Disponíveis</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10">
              <Users className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{busyCount}</p>
              <p className="text-sm text-muted-foreground">Em atendimento</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="stat-card">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Shift Filter */}
            <div className="flex gap-2 flex-wrap">
              {shiftFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={shiftFilter === filter.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShiftFilter(filter.value)}
                  className={cn(shiftFilter === filter.value && 'bg-primary')}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Attendants Grid */}
        {filteredAttendants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAttendants.map((attendant) => (
              <AttendantCard key={attendant.id} attendant={attendant} />
            ))}
          </div>
        ) : (
          <div className="stat-card flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Nenhum manobrista encontrado
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
