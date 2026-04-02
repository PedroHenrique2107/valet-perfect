import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Car,
  Download,
  DollarSign,
  FileText,
  ParkingSquare,
  Users,
} from "lucide-react";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { VehicleMovementChart } from "@/components/dashboard/VehicleMovementChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAttendantsQuery,
  useClientsQuery,
  useParkingSpotsQuery,
  useTransactionsQuery,
  useVehiclesQuery,
} from "@/hooks/useValetData";
import { formatCurrencyBRL, formatDateTimeBR, formatDurationMinutes } from "@/lib/format";
import { getRevenueCategory, getTransactionSourceLabel, resolveTransactionClientName } from "@/lib/transactions";
import type { Client, RevenueData, Transaction, Vehicle } from "@/types/valet";

type PeriodPreset = "today" | "7d" | "1m" | "6m" | "1y" | "custom";
type ReportFocus = "overview" | "financial" | "operations";

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "1m", label: "Ultimo mes" },
  { value: "6m", label: "Ultimos 6 meses" },
  { value: "1y", label: "Ultimo ano" },
  { value: "custom", label: "Personalizado" },
];

const reportFocusOptions: Array<{ value: ReportFocus; label: string }> = [
  { value: "overview", label: "Visao geral" },
  { value: "financial", label: "Financeiro" },
  { value: "operations", label: "Operacional" },
];

function getResolvedRange(period: PeriodPreset, customRange?: DateRange) {
  const now = new Date();

  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "7d":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "1m":
      return { start: startOfDay(subMonths(now, 1)), end: endOfDay(now) };
    case "6m":
      return { start: startOfDay(subMonths(now, 6)), end: endOfDay(now) };
    case "1y":
      return { start: startOfDay(subYears(now, 1)), end: endOfDay(now) };
    case "custom":
      return {
        start: startOfDay(customRange?.from ?? subDays(now, 6)),
        end: endOfDay(customRange?.to ?? customRange?.from ?? now),
      };
  }
}

function getPeriodLabel(period: PeriodPreset, customRange?: DateRange) {
  if (period !== "custom") {
    return periodOptions.find((option) => option.value === period)?.label ?? "Periodo";
  }

  if (customRange?.from && customRange?.to) {
    return `${format(customRange.from, "dd/MM/yyyy")} ate ${format(customRange.to, "dd/MM/yyyy")}`;
  }

  if (customRange?.from) {
    return format(customRange.from, "dd/MM/yyyy");
  }

  return "Personalizado";
}

function buildRevenueChartData(transactions: Transaction[], start: Date, end: Date): RevenueData[] {
  const spanInDays = differenceInCalendarDays(end, start) + 1;
  const useMonthlyBuckets = spanInDays > 62;

  if (useMonthlyBuckets) {
    return eachMonthOfInterval({ start, end }).map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthTransactions = transactions.filter((transaction) =>
        isWithinInterval(transaction.createdAt, { start: monthStart, end: monthEnd }),
      );

      return {
        date: format(monthDate, "MMM/yy", { locale: ptBR }),
        revenue: monthTransactions.reduce((acc, transaction) => acc + transaction.amount, 0),
        transactions: monthTransactions.length,
      };
    });
  }

  return eachDayOfInterval({ start, end }).map((dayDate) => {
    const dayTransactions = transactions.filter((transaction) =>
      isWithinInterval(transaction.createdAt, { start: startOfDay(dayDate), end: endOfDay(dayDate) }),
    );

    return {
      date: format(dayDate, "dd/MM"),
      revenue: dayTransactions.reduce((acc, transaction) => acc + transaction.amount, 0),
      transactions: dayTransactions.length,
    };
  });
}

function buildVehicleMovementData(vehicles: Vehicle[], start: Date, end: Date) {
  const spanInDays = differenceInCalendarDays(end, start) + 1;
  const useMonthlyBuckets = spanInDays > 62;

  if (useMonthlyBuckets) {
    return eachMonthOfInterval({ start, end }).map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      return {
        label: format(monthDate, "MMM/yy", { locale: ptBR }),
        entries: vehicles.filter((vehicle) =>
          isWithinInterval(vehicle.entryTime, { start: monthStart, end: monthEnd }),
        ).length,
        exits: vehicles.filter(
          (vehicle) =>
            vehicle.exitTime &&
            isWithinInterval(vehicle.exitTime, { start: monthStart, end: monthEnd }),
        ).length,
      };
    });
  }

  return eachDayOfInterval({ start, end }).map((dayDate) => ({
    label: format(dayDate, "dd/MM"),
    entries: vehicles.filter((vehicle) =>
      isWithinInterval(vehicle.entryTime, { start: startOfDay(dayDate), end: endOfDay(dayDate) }),
    ).length,
    exits: vehicles.filter(
      (vehicle) =>
        vehicle.exitTime &&
        isWithinInterval(vehicle.exitTime, { start: startOfDay(dayDate), end: endOfDay(dayDate) }),
    ).length,
  }));
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function getClientLabel(clientName: string) {
  const trimmed = clientName.trim();
  return trimmed.length > 0 ? trimmed : "Sem identificacao";
}

function buildTopClients(clients: Client[], vehicles: Vehicle[], transactions: Transaction[]) {
  return clients
    .map((client) => {
      const clientVehicles = vehicles.filter((vehicle) => vehicle.linkedClientId === client.id);
      const clientTransactions = transactions.filter((transaction) => {
        const relatedVehicle = vehicles.find((vehicle) => vehicle.id === transaction.vehicleId);
        return relatedVehicle?.linkedClientId === client.id || transaction.clientName === client.name;
      });

      return {
        name: client.name,
        vehicles: client.vehicles.length,
        visits: Math.max(client.totalVisits, clientVehicles.length),
        revenue: clientTransactions.reduce((acc, transaction) => acc + transaction.amount, 0),
      };
    })
    .sort((left, right) => right.revenue - left.revenue || right.visits - left.visits)
    .slice(0, 5);
}

export default function ReportsPage() {
  const { data: vehicles = [] } = useVehiclesQuery();
  const { data: transactions = [] } = useTransactionsQuery();
  const { data: attendants = [] } = useAttendantsQuery();
  const { data: parkingSpots = [] } = useParkingSpotsQuery();
  const { data: clients = [] } = useClientsQuery();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>("7d");
  const [focus, setFocus] = useState<ReportFocus>("overview");
  const [periodPopoverOpen, setPeriodPopoverOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });

  const activeRange = useMemo(
    () => getResolvedRange(selectedPeriod, customRange),
    [customRange, selectedPeriod],
  );

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) =>
        isWithinInterval(vehicle.entryTime, { start: activeRange.start, end: activeRange.end }),
      ),
    [activeRange.end, activeRange.start, vehicles],
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isWithinInterval(transaction.createdAt, { start: activeRange.start, end: activeRange.end }),
      ),
    [activeRange.end, activeRange.start, transactions],
  );

  const completedTransactions = filteredTransactions.filter((transaction) => transaction.status === "completed");
  const deliveredVehicles = filteredVehicles.filter((vehicle) => vehicle.status === "delivered" || vehicle.exitTime);
  const longStayVehicles = vehicles
    .filter((vehicle) => vehicle.status === "parked")
    .filter((vehicle) => Date.now() - vehicle.entryTime.getTime() > 12 * 60 * 60 * 1000)
    .sort((left, right) => left.entryTime.getTime() - right.entryTime.getTime())
    .slice(0, 5);
  const pendingTransactions = filteredTransactions
    .filter((transaction) => transaction.status === "pending")
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 5);
  const overdueClients = clients
    .filter((client) => client.category === "monthly" && client.billingDueDate.getTime() < Date.now())
    .sort((left, right) => left.billingDueDate.getTime() - right.billingDueDate.getTime())
    .slice(0, 5);

  const periodRevenue = completedTransactions.reduce((acc, transaction) => acc + transaction.amount, 0);
  const averageTicket = completedTransactions.length > 0 ? periodRevenue / completedTransactions.length : 0;
  const averageStay =
    deliveredVehicles.length > 0
      ? Math.round(
          deliveredVehicles.reduce((acc, vehicle) => {
            const exitTime = vehicle.exitTime ?? vehicle.entryTime;
            return acc + Math.max(1, Math.round((exitTime.getTime() - vehicle.entryTime.getTime()) / 60000));
          }, 0) / deliveredVehicles.length,
        )
      : 0;
  const occupancyRate =
    parkingSpots.length > 0
      ? Math.round((parkingSpots.filter((spot) => spot.status === "occupied").length / parkingSpots.length) * 100)
      : 0;

  const revenueBreakdown = completedTransactions.reduce(
    (acc, transaction) => {
      const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);
      const category = getRevenueCategory(transaction, vehicle);
      acc[category] += transaction.amount;
      return acc;
    },
    { monthly: 0, agreement: 0, avulso: 0 },
  );

  const chartData = useMemo(
    () => buildRevenueChartData(completedTransactions, activeRange.start, activeRange.end),
    [activeRange.end, activeRange.start, completedTransactions],
  );
  const movementData = useMemo(
    () => buildVehicleMovementData(filteredVehicles, activeRange.start, activeRange.end),
    [activeRange.end, activeRange.start, filteredVehicles],
  );
  const topClients = useMemo(
    () => buildTopClients(clients, filteredVehicles, completedTransactions),
    [clients, completedTransactions, filteredVehicles],
  );

  const attendantPerformance = useMemo(() => {
    const rows = attendants.map((attendant) => {
      const handledVehicles = filteredVehicles.filter((vehicle) => vehicle.attendantId === attendant.id);
      const attendantRevenue = completedTransactions
        .filter((transaction) => handledVehicles.some((vehicle) => vehicle.id === transaction.vehicleId))
        .reduce((acc, transaction) => acc + transaction.amount, 0);

      return {
        id: attendant.id,
        name: attendant.name,
        status: attendant.status,
        handledVehicles: handledVehicles.length,
        averageMinutes:
          handledVehicles.length > 0
            ? Math.round(
                handledVehicles.reduce((acc, vehicle) => {
                  const exitTime = vehicle.exitTime ?? new Date();
                  return acc + Math.max(1, Math.round((exitTime.getTime() - vehicle.entryTime.getTime()) / 60000));
                }, 0) / handledVehicles.length,
              )
            : 0,
        revenue: attendantRevenue,
      };
    });

    return rows
      .sort((left, right) => right.handledVehicles - left.handledVehicles || right.revenue - left.revenue)
      .slice(0, 5);
  }, [attendants, completedTransactions, filteredVehicles]);

  const periodLabel = getPeriodLabel(selectedPeriod, customRange);
  const rangeLabel = `${format(activeRange.start, "dd/MM/yyyy")} - ${format(activeRange.end, "dd/MM/yyyy")}`;

  const summaryRows = completedTransactions
    .slice()
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 20)
    .map((transaction) => {
      const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);
      const clientName = resolveTransactionClientName(transaction, vehicle, clients);
      return [
        formatDateTimeBR(transaction.createdAt),
        vehicle?.plate ?? "-",
        getClientLabel(clientName),
        getTransactionSourceLabel(transaction, vehicle, clients),
        transaction.receiptNumber,
        transaction.paymentMethod,
        transaction.status,
        transaction.amount,
      ];
    });

  const handleExport = () => {
    downloadCsv(
      `relatorios-${format(new Date(), "yyyy-MM-dd")}.csv`,
      ["data_hora", "placa", "cliente", "origem", "recibo", "pagamento", "status", "valor"],
      summaryRows,
    );
  };

  const reportTitle =
    focus === "financial"
      ? "Relatorios Financeiros"
      : focus === "operations"
        ? "Relatorios Operacionais"
        : "Relatorios Gerenciais";
  const reportDescription =
    focus === "financial"
      ? "Receita, ticket medio e distribuicao por modalidade de pagamento."
      : focus === "operations"
        ? "Fluxo de veiculos, ocupacao do patio e performance da equipe."
        : "Uma visao consolidada da operacao e do caixa da unidade.";

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{reportTitle}</h1>
            <p className="text-muted-foreground">{reportDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Popover open={periodPopoverOpen} onOpenChange={setPeriodPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {periodLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[360px] space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Filtrar periodo</p>
                  <div className="grid grid-cols-2 gap-2">
                    {periodOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={selectedPeriod === option.value ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => {
                          setSelectedPeriod(option.value);
                          if (option.value !== "custom") {
                            setPeriodPopoverOpen(false);
                          }
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedPeriod === "custom" && (
                  <div className="rounded-lg border border-border">
                    <DatePickerCalendar
                      mode="range"
                      numberOfMonths={1}
                      selected={customRange}
                      onSelect={setCustomRange}
                      locale={ptBR}
                    />
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Intervalo ativo: {rangeLabel}
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Foco do painel</p>
            <Select value={focus} onValueChange={(value) => setFocus(value as ReportFocus)}>
              <SelectTrigger className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportFocusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-2 lg:justify-end">
            <Badge variant="outline" className="h-10 px-3 text-sm">
              Periodo: {rangeLabel}
            </Badge>
            <Badge variant="outline" className="h-10 px-3 text-sm">
              Veiculos no recorte: {filteredVehicles.length}
            </Badge>
            <Badge variant="outline" className="h-10 px-3 text-sm">
              Transacoes: {filteredTransactions.length}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Receita consolidada"
            value={formatCurrencyBRL(periodRevenue)}
            subtitle={periodLabel}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Veiculos atendidos"
            value={deliveredVehicles.length}
            subtitle="Com saida registrada no periodo"
            icon={Car}
            variant="primary"
          />
          <StatCard
            title="Ticket medio"
            value={formatCurrencyBRL(averageTicket)}
            subtitle="Pagamentos concluidos"
            icon={FileText}
            variant="info"
          />
          <StatCard
            title="Ocupacao atual"
            value={`${occupancyRate}%`}
            subtitle={`${parkingSpots.filter((spot) => spot.status === "occupied").length} vagas ocupadas agora`}
            icon={ParkingSquare}
            variant={occupancyRate >= 85 ? "warning" : "default"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Tempo medio de permanencia"
            value={formatDurationMinutes(averageStay)}
            subtitle="Com base nas saidas do periodo"
            icon={BarChart3}
            variant="warning"
          />
          <StatCard
            title="Clientes em atraso"
            value={overdueClients.length}
            subtitle="Mensalistas com vencimento passado"
            icon={AlertTriangle}
            variant={overdueClients.length > 0 ? "warning" : "success"}
          />
          <StatCard
            title="Manobristas com atividade"
            value={attendantPerformance.filter((row) => row.handledVehicles > 0).length}
            subtitle="Equipe com movimentacao no periodo"
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Pendencias financeiras"
            value={pendingTransactions.length}
            subtitle="Transacoes pendentes no recorte"
            icon={FileText}
            variant={pendingTransactions.length > 0 ? "warning" : "success"}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <RevenueChart
              data={chartData}
              title="Receita no periodo"
              subtitle={rangeLabel}
              summaryNote={`${completedTransactions.length} pagamentos concluidos`}
              breakdown={[
                { label: "Mensalidade", value: revenueBreakdown.monthly, tone: "primary" },
                { label: "Credenciado", value: revenueBreakdown.agreement, tone: "info" },
                { label: "Avulso", value: revenueBreakdown.avulso, tone: "success" },
              ]}
            />
            <VehicleMovementChart
              data={movementData}
              title="Movimentacao de veiculos"
              subtitle={`Entradas e saidas entre ${rangeLabel}`}
            />
          </div>

          <Card className="border-border bg-card/80">
            <CardHeader>
              <CardTitle>Alertas e Prioridades</CardTitle>
              <CardDescription>Pontos que pedem atencao imediata da operacao.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warning">Veiculos com longa estadia</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{longStayVehicles.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">Estacionados ha mais de 12 horas.</p>
              </div>
              <div className="rounded-xl border border-info/30 bg-info/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-info">Mensalistas em atraso</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{overdueClients.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">Revise cobrancas e regularizacao.</p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pagamentos pendentes</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{pendingTransactions.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">Transacoes abertas dentro do periodo filtrado.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="stat-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Top Clientes</h3>
                <p className="text-sm text-muted-foreground">Maior impacto financeiro e de visitas</p>
              </div>
              <Badge variant="outline">{topClients.length} clientes</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Visitas</th>
                    <th>Veiculos</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((client) => (
                    <tr key={client.name}>
                      <td className="font-medium text-foreground">{client.name}</td>
                      <td>{client.visits}</td>
                      <td>{client.vehicles}</td>
                      <td className="font-semibold text-foreground">{formatCurrencyBRL(client.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {topClients.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum cliente consolidado para o periodo selecionado.
                </div>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Performance da Equipe</h3>
                <p className="text-sm text-muted-foreground">Atendimento consolidado por manobrista</p>
              </div>
              <Badge variant="outline">{attendantPerformance.length} registros</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Manobrista</th>
                    <th>Status</th>
                    <th>Veiculos</th>
                    <th>Tempo medio</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {attendantPerformance.map((attendant) => (
                    <tr key={attendant.id}>
                      <td className="font-medium text-foreground">{attendant.name}</td>
                      <td>
                        <Badge variant="outline">{attendant.status}</Badge>
                      </td>
                      <td>{attendant.handledVehicles}</td>
                      <td>{formatDurationMinutes(attendant.averageMinutes)}</td>
                      <td className="font-semibold text-foreground">{formatCurrencyBRL(attendant.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendantPerformance.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma movimentacao da equipe no periodo selecionado.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="stat-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Transacoes Recentes do Relatorio</h3>
                <p className="text-sm text-muted-foreground">Ultimos pagamentos concluidos dentro do recorte ativo</p>
              </div>
              <Badge variant="outline">{summaryRows.length} linhas exportaveis</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Placa</th>
                    <th>Cliente</th>
                    <th>Origem</th>
                    <th>Recibo</th>
                    <th>Pagamento</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row) => (
                    <tr key={`${row[0]}-${row[4]}`}>
                      <td>{row[0]}</td>
                      <td className="font-mono">{row[1]}</td>
                      <td>{row[2]}</td>
                      <td>{row[3]}</td>
                      <td className="font-mono">{row[4]}</td>
                      <td>{row[5]}</td>
                      <td className="font-semibold text-foreground">{formatCurrencyBRL(Number(row[7]))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {summaryRows.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma transacao concluida encontrada no periodo.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="stat-card">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Longa Estadia</h3>
                  <p className="text-sm text-muted-foreground">Veiculos ainda estacionados</p>
                </div>
                <Badge variant="outline">{longStayVehicles.length}</Badge>
              </div>
              <div className="space-y-3">
                {longStayVehicles.length > 0 ? (
                  longStayVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-semibold text-foreground">{vehicle.plate}</p>
                          <p className="text-sm text-muted-foreground">{getClientLabel(vehicle.clientName)}</p>
                        </div>
                        <Badge variant="outline">{formatDateTimeBR(vehicle.entryTime)}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum veiculo acima do limite configurado.</p>
                )}
              </div>
            </div>

            <div className="stat-card">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Mensalistas em Atraso</h3>
                  <p className="text-sm text-muted-foreground">Clientes para acao de cobranca</p>
                </div>
                <Badge variant="outline">{overdueClients.length}</Badge>
              </div>
              <div className="space-y-3">
                {overdueClients.length > 0 ? (
                  overdueClients.map((client) => (
                    <div key={client.id} className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.phone}</p>
                        </div>
                        <Badge variant="outline">{format(client.billingDueDate, "dd/MM/yyyy")}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum mensalista vencido no momento.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
