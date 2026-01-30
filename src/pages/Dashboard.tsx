import { 
  Car, 
  ParkingSquare, 
  DollarSign, 
  Clock, 
  Users, 
  Timer,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { VehicleStatusCard } from '@/components/dashboard/VehicleStatusCard';
import { AttendantCard } from '@/components/dashboard/AttendantCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { OccupancyChart } from '@/components/dashboard/OccupancyChart';
import { ParkingMap } from '@/components/dashboard/ParkingMap';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import {
  mockVehicles,
  mockAttendants,
  mockParkingSpots,
  mockDashboardStats,
  mockRevenueData,
  mockOccupancyData,
} from '@/data/mockData';

export default function Dashboard() {
  const stats = mockDashboardStats;
  const requestedVehicles = mockVehicles.filter((v) => v.status === 'requested' || v.status === 'in_transit');
  const activeAttendants = mockAttendants.filter((a) => a.isOnline);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta! Aqui está o resumo de hoje.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span>Sistema online</span>
          </div>
          <span className="text-border">•</span>
          <span>Atualizado às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Veículos Hoje"
          value={stats.totalVehicles}
          subtitle="12 entradas na última hora"
          icon={Car}
          trend={{ value: 8.2, isPositive: true }}
          variant="primary"
        />
        <StatCard
          title="Vagas Disponíveis"
          value={`${stats.availableSpots}/${stats.availableSpots + stats.totalVehicles}`}
          subtitle={`${stats.occupancyRate}% de ocupação`}
          icon={ParkingSquare}
          variant="success"
        />
        <StatCard
          title="Receita Hoje"
          value={`R$ ${stats.todayRevenue.toLocaleString('pt-BR')}`}
          subtitle="Ticket médio R$ 42,50"
          icon={DollarSign}
          trend={{ value: 15.3, isPositive: true }}
          variant="info"
        />
        <StatCard
          title="Tempo Médio"
          value={`${Math.floor(stats.avgStayDuration / 60)}h ${stats.avgStayDuration % 60}min`}
          subtitle="De permanência"
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Manobristas Ativos"
          value={stats.activeAttendants}
          subtitle="De 6 no turno"
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Veículos Aguardando"
          value={stats.vehiclesWaiting}
          subtitle="Na fila de saída"
          icon={Timer}
          variant={stats.vehiclesWaiting > 5 ? 'warning' : 'default'}
        />
        <StatCard
          title="Tempo de Espera"
          value={`${stats.avgWaitTime} min`}
          subtitle="Média de espera"
          icon={AlertTriangle}
          variant={stats.avgWaitTime > 5 ? 'warning' : 'success'}
        />
        <StatCard
          title="Performance"
          value="94%"
          subtitle="Índice de eficiência"
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RevenueChart data={mockRevenueData} />
            <OccupancyChart data={mockOccupancyData} />
          </div>
          
          {/* Parking Map */}
          <ParkingMap spots={mockParkingSpots} />
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>

      {/* Vehicles & Attendants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requested Vehicles */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Veículos em Atendimento</h2>
              <p className="text-sm text-muted-foreground">Solicitados e em trânsito</p>
            </div>
            <button className="text-sm text-primary hover:underline">Ver todos</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {requestedVehicles.length > 0 ? (
              requestedVehicles.map((vehicle) => (
                <VehicleStatusCard key={vehicle.id} vehicle={vehicle} />
              ))
            ) : (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                Nenhum veículo aguardando
              </div>
            )}
          </div>
        </div>

        {/* Active Attendants */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Manobristas do Turno</h2>
              <p className="text-sm text-muted-foreground">{activeAttendants.length} ativos agora</p>
            </div>
            <button className="text-sm text-primary hover:underline">Ver todos</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeAttendants.slice(0, 4).map((attendant) => (
              <AttendantCard key={attendant.id} attendant={attendant} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
