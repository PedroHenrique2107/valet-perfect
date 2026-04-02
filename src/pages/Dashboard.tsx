import { useState } from "react";
import {
  AlertTriangle,
  Car,
  Clock,
  DollarSign,
  ParkingSquare,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AttendantCard } from "@/components/dashboard/AttendantCard";
import { OccupancyChart } from "@/components/dashboard/OccupancyChart";
import { ParkingMap } from "@/components/dashboard/ParkingMap";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { VehicleStatusCard } from "@/components/dashboard/VehicleStatusCard";
import { ClientCreateDialog } from "@/components/forms/ClientCreateDialog";
import { VehicleEntryDialog } from "@/components/forms/VehicleEntryDialog";
import { VehicleExitDialog } from "@/components/forms/VehicleExitDialog";
import {
  useActivitiesQuery,
  useAttendantsQuery,
  useDashboardStatsQuery,
  useOccupancyDataQuery,
  useParkingSpotsQuery,
  useRequestVehicleMutation,
  useRevenueDataQuery,
  useTransactionsQuery,
  useVehiclesQuery,
} from "@/hooks/useValetData";
import { useCan } from "@/contexts/AuthContext";
import { formatCurrencyBRL, formatDurationMinutes, formatTimeBR } from "@/lib/format";
import { getRevenueCategory } from "@/lib/transactions";
import type { Vehicle } from "@/types/valet";

export default function Dashboard() {
  const { data: stats } = useDashboardStatsQuery();
  const { data: vehicles = [] } = useVehiclesQuery();
  const { data: attendants = [] } = useAttendantsQuery();
  const { data: parkingSpots = [] } = useParkingSpotsQuery();
  const { data: revenueData = [] } = useRevenueDataQuery();
  const { data: transactions = [] } = useTransactionsQuery();
  const { data: occupancyData = [] } = useOccupancyDataQuery();
  const { data: activities = [] } = useActivitiesQuery();
  const requestVehicle = useRequestVehicleMutation();

  const canCreateVehicle = useCan("create_vehicle");
  const canRegisterExit = useCan("register_exit");
  const canCreateClient = useCan("create_client");

  const [entryOpen, setEntryOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const requestedVehicles = vehicles.filter(
    (vehicle) => vehicle.status === "requested" || vehicle.status === "in_transit",
  );
  const activeAttendants = attendants.filter((attendant) => attendant.isOnline);
  const todayCompletedTransactions = transactions.filter((transaction) => {
    const now = new Date();
    return (
      transaction.status === "completed" &&
      transaction.createdAt.getFullYear() === now.getFullYear() &&
      transaction.createdAt.getMonth() === now.getMonth() &&
      transaction.createdAt.getDate() === now.getDate()
    );
  });
  const revenueBreakdown = {
    monthly: todayCompletedTransactions
      .filter((transaction) => {
        const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);
        return getRevenueCategory(transaction, vehicle) === "monthly";
      })
      .reduce((acc, transaction) => acc + transaction.amount, 0),
    agreement: todayCompletedTransactions
      .filter((transaction) => {
        const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);
        return getRevenueCategory(transaction, vehicle) === "agreement";
      })
      .reduce((acc, transaction) => acc + transaction.amount, 0),
    avulso: todayCompletedTransactions
      .filter((transaction) => {
        const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);
        return getRevenueCategory(transaction, vehicle) === "avulso";
      })
      .reduce((acc, transaction) => acc + transaction.amount, 0),
  };

  if (!stats) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo de volta. Aqui está o resumo de hoje.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
            <span>Sistema online</span>
          </div>
          <span className="text-border">•</span>
          <span>Atualizado às {formatTimeBR(new Date())}</span>
        </div>
      </div>

      <QuickActions
        permissions={{
          createVehicle: canCreateVehicle,
          registerExit: canRegisterExit,
          createClient: canCreateClient,
        }}
        onNewEntry={() => setEntryOpen(true)}
        onRegisterExit={() => setExitOpen(true)}
        onCreateClient={() => setClientOpen(true)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          value={formatCurrencyBRL(stats.todayRevenue)}
          subtitle="Ticket médio R$ 42,50"
          icon={DollarSign}
          trend={{ value: 15.3, isPositive: true }}
          variant="info"
        />
        <StatCard
          title="Tempo Médio"
          value={formatDurationMinutes(stats.avgStayDuration)}
          subtitle="De permanência"
          icon={Clock}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Manobristas Ativos" value={stats.activeAttendants} subtitle="De 6 no turno" icon={Users} />
        <StatCard
          title="Veículos Aguardando"
          value={stats.vehiclesWaiting}
          subtitle="Na fila de saída"
          icon={Timer}
          variant={stats.vehiclesWaiting > 5 ? "warning" : "default"}
        />
        <StatCard
          title="Tempo de Espera"
          value={`${stats.avgWaitTime} min`}
          subtitle="Média de espera"
          icon={AlertTriangle}
          variant={stats.avgWaitTime > 5 ? "warning" : "success"}
        />
        <StatCard title="Performance" value="94%" subtitle="Índice de eficiência" icon={TrendingUp} variant="success" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <RevenueChart
              data={revenueData}
              breakdown={[
                { label: "Mensalidade", value: revenueBreakdown.monthly, tone: "primary" },
                { label: "Credenciado", value: revenueBreakdown.agreement, tone: "info" },
                { label: "Avulso", value: revenueBreakdown.avulso, tone: "success" },
              ]}
            />
            <OccupancyChart data={occupancyData} />
          </div>
          <ParkingMap spots={parkingSpots} />
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed activities={activities} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Veículos em Atendimento</h2>
              <p className="text-sm text-muted-foreground">Solicitados e em trânsito</p>
            </div>
            <button className="text-sm text-primary hover:underline">Ver todos</button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {requestedVehicles.length > 0 ? (
              requestedVehicles.map((vehicle) => (
                <VehicleStatusCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  canRequest={canCreateVehicle}
                  canRegisterExit={canRegisterExit}
                  onRequestVehicle={(item) => requestVehicle.mutate(item.id)}
                  onRegisterExit={(item) => {
                    setSelectedVehicle(item);
                    setExitOpen(true);
                  }}
                />
              ))
            ) : (
              <div className="col-span-2 py-8 text-center text-muted-foreground">Nenhum veículo aguardando</div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Manobristas do Turno</h2>
              <p className="text-sm text-muted-foreground">{activeAttendants.length} ativos agora</p>
            </div>
            <button className="text-sm text-primary hover:underline">Ver todos</button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {activeAttendants.slice(0, 4).map((attendant) => (
              <AttendantCard key={attendant.id} attendant={attendant} />
            ))}
          </div>
        </div>
      </div>

      <VehicleEntryDialog open={entryOpen} onOpenChange={setEntryOpen} />
      <VehicleExitDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        initialVehicleId={selectedVehicle?.id}
      />
      <ClientCreateDialog open={clientOpen} onOpenChange={setClientOpen} />
    </div>
  );
}
