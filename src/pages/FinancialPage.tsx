import {
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
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
import { StatCard } from "@/components/dashboard/StatCard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useDashboardStatsQuery,
  useTransactionsQuery,
  useVehiclesQuery,
} from "@/hooks/useValetData";
import { formatCurrencyBRL, formatDateTimeBR, formatDurationMinutes } from "@/lib/format";
import type { PaymentMethod, PaymentStatus, RevenueData, Transaction } from "@/types/valet";

type PeriodPreset = "today" | "7d" | "1m" | "6m" | "1y" | "custom";

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "1m", label: "Ultimo mes" },
  { value: "6m", label: "Ultimos 6 meses" },
  { value: "1y", label: "Ultimo 1 ano" },
  { value: "custom", label: "Personalizado" },
];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: "PIX",
  credit: "Credito",
  debit: "Debito",
  cash: "Dinheiro",
  monthly: "Mensalista",
};

const paymentMethodColors: Record<PaymentMethod, string> = {
  pix: "bg-primary",
  credit: "bg-info",
  debit: "bg-accent",
  cash: "bg-warning",
  monthly: "bg-secondary",
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "status-busy" },
  completed: { label: "Concluido", className: "status-available" },
  failed: { label: "Falhou", className: "status-occupied" },
  refunded: { label: "Estornado", className: "bg-muted text-muted-foreground" },
};

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

function buildRevenueChartData(
  transactions: Transaction[],
  start: Date,
  end: Date,
): RevenueData[] {
  const spanInDays = differenceInCalendarDays(end, start) + 1;
  const useMonthlyBuckets = spanInDays > 62;

  if (useMonthlyBuckets) {
    const months = eachMonthOfInterval({ start, end });
    return months.map((monthDate) => {
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

  const days = eachDayOfInterval({ start, end });
  return days.map((dayDate) => {
    const dayStart = startOfDay(dayDate);
    const dayEnd = endOfDay(dayDate);
    const dayTransactions = transactions.filter((transaction) =>
      isWithinInterval(transaction.createdAt, { start: dayStart, end: dayEnd }),
    );

    return {
      date: format(dayDate, "dd/MM"),
      revenue: dayTransactions.reduce((acc, transaction) => acc + transaction.amount, 0),
      transactions: dayTransactions.length,
    };
  });
}

export default function FinancialPage() {
  const navigate = useNavigate();
  const { data: dashboardStats } = useDashboardStatsQuery();
  const { data: transactions = [] } = useTransactionsQuery();
  const { data: vehicles = [] } = useVehiclesQuery();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>("7d");
  const [periodPopoverOpen, setPeriodPopoverOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });

  const activeRange = useMemo(
    () => getResolvedRange(selectedPeriod, customRange),
    [customRange, selectedPeriod],
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isWithinInterval(transaction.createdAt, {
          start: activeRange.start,
          end: activeRange.end,
        }),
      ),
    [activeRange.end, activeRange.start, transactions],
  );

  const completedTransactions = useMemo(
    () =>
      [...filteredTransactions]
        .filter((transaction) => transaction.status === "completed")
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    [filteredTransactions],
  );

  const pendingTransactions = filteredTransactions.filter(
    (transaction) => transaction.status === "pending",
  );
  const periodRevenue = completedTransactions.reduce((acc, transaction) => acc + transaction.amount, 0);
  const completedCount = completedTransactions.length;
  const avgTicket = completedCount > 0 ? periodRevenue / completedCount : 0;
  const paymentBreakdown = Object.entries(
    completedTransactions.reduce<Record<PaymentMethod, { amount: number; count: number }>>(
      (acc, transaction) => {
        acc[transaction.paymentMethod].amount += transaction.amount;
        acc[transaction.paymentMethod].count += 1;
        return acc;
      },
      {
        pix: { amount: 0, count: 0 },
        credit: { amount: 0, count: 0 },
        debit: { amount: 0, count: 0 },
        cash: { amount: 0, count: 0 },
        monthly: { amount: 0, count: 0 },
      },
    ),
  )
    .map(([method, summary]) => ({
      method: method as PaymentMethod,
      ...summary,
      share: periodRevenue > 0 ? (summary.amount / periodRevenue) * 100 : 0,
    }))
    .filter((item) => item.amount > 0 || item.count > 0)
    .sort((left, right) => right.amount - left.amount);

  const chartData = useMemo(
    () => buildRevenueChartData(completedTransactions, activeRange.start, activeRange.end),
    [activeRange.end, activeRange.start, completedTransactions],
  );

  const periodLabel = getPeriodLabel(selectedPeriod, customRange);
  const rangeLabel = `${format(activeRange.start, "dd/MM/yyyy")} - ${format(activeRange.end, "dd/MM/yyyy")}`;

  const handleExport = () => {
    const workbook = XLSX.utils.book_new();

    const summaryRows = [
      ["Relatorio Financeiro ValetTracker"],
      [`Periodo: ${periodLabel}`],
      [`Intervalo: ${rangeLabel}`],
      [`Gerado em: ${formatDateTimeBR(new Date())}`],
      [],
      ["Indicador", "Valor"],
      ["Receita do periodo", periodRevenue],
      ["Transacoes concluidas", completedCount],
      ["Ticket medio", avgTicket],
      ["Transacoes pendentes", pendingTransactions.length],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet["!cols"] = [{ wch: 28 }, { wch: 22 }];
    summarySheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    ];
    ["B7", "B9"].forEach((cell) => {
      if (summarySheet[cell]) {
        summarySheet[cell].z = '"R$" #,##0.00';
      }
    });

    const transactionRows = filteredTransactions.map((transaction) => {
      const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);
      return {
        Recibo: transaction.receiptNumber,
        Placa: vehicle?.plate ?? "-",
        Cliente: vehicle?.clientName ?? "-",
        Valor: transaction.amount,
        Pagamento: paymentMethodLabels[transaction.paymentMethod],
        Status: paymentStatusConfig[transaction.status].label,
        "Duracao (min)": transaction.duration,
        "Criado em": formatDateTimeBR(transaction.createdAt),
      };
    });

    const transactionsSheet = XLSX.utils.json_to_sheet(transactionRows);
    transactionsSheet["!cols"] = [
      { wch: 18 },
      { wch: 12 },
      { wch: 24 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
    ];
    transactionRows.forEach((_row, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: index + 1, c: 3 });
      if (transactionsSheet[cellAddress]) {
        transactionsSheet[cellAddress].z = '"R$" #,##0.00';
      }
    });

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");
    XLSX.utils.book_append_sheet(workbook, transactionsSheet, "Transacoes");
    XLSX.writeFile(workbook, `financeiro-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">
              Acompanhe receitas, pagamentos e integracoes operacionais
            </p>
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
              Exportar
            </Button>
            <Button size="sm" className="gap-2" onClick={() => navigate("/vehicles?status=delivered")}>
              <Receipt className="h-4 w-4" />
              Veiculos entregues
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={`Receita - ${periodLabel}`}
            value={formatCurrencyBRL(periodRevenue)}
            subtitle={rangeLabel}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Transacoes concluidas"
            value={completedCount}
            subtitle={periodLabel}
            icon={TrendingUp}
            variant="primary"
          />
          <StatCard
            title="Ticket medio"
            value={formatCurrencyBRL(avgTicket)}
            subtitle="Media por pagamento concluido"
            icon={Receipt}
            variant="info"
          />
          <StatCard
            title="Transacoes pendentes"
            value={pendingTransactions.length}
            subtitle={periodLabel}
            icon={CreditCard}
            variant={pendingTransactions.length > 0 ? "warning" : "default"}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart
              data={chartData}
              title={`Receita - ${periodLabel}`}
              subtitle={rangeLabel}
              summaryNote={`${completedCount} pagamento(s) concluido(s)`}
            />
          </div>

          <div className="stat-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">Por Forma de Pagamento</h3>
                <p className="text-sm text-muted-foreground">Resumo do periodo filtrado</p>
              </div>
              <Badge variant="outline">{completedCount} pagamentos</Badge>
            </div>
            <div className="space-y-4">
              {paymentBreakdown.length > 0 ? (
                paymentBreakdown.map((item) => (
                  <div key={item.method} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${paymentMethodColors[item.method]}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{paymentMethodLabels[item.method]}</p>
                        <p className="text-xs text-muted-foreground">{item.count} transacao(oes)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatCurrencyBRL(item.amount)}</p>
                      <p className="text-xs text-muted-foreground">{item.share.toFixed(1)}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum pagamento concluido no periodo.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="stat-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Transacoes Recentes</h3>
                <p className="text-sm text-muted-foreground">
                  Lista atualizada pelo mesmo filtro de periodo
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => navigate("/vehicles?status=delivered")}
              >
                Ver todas
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Veiculo</th>
                    <th>Recibo</th>
                    <th>Valor</th>
                    <th>Pagamento</th>
                    <th>Duracao</th>
                    <th>Status</th>
                    <th>Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const status = paymentStatusConfig[transaction.status];
                    const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);

                    return (
                      <tr key={transaction.id}>
                        <td>
                          {vehicle ? (
                            <button
                              type="button"
                              className="text-left text-sm font-medium text-primary hover:underline"
                              onClick={() =>
                                navigate(
                                  `/vehicles?status=${vehicle.status === "delivered" ? "delivered" : "all"}&q=${encodeURIComponent(vehicle.plate)}`,
                                )
                              }
                            >
                              {vehicle.plate}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td>
                          <span className="font-mono text-sm">{transaction.receiptNumber}</span>
                        </td>
                        <td>
                          <span className="font-semibold text-foreground">
                            {formatCurrencyBRL(transaction.amount)}
                          </span>
                        </td>
                        <td>
                          <Badge variant="outline">{paymentMethodLabels[transaction.paymentMethod]}</Badge>
                        </td>
                        <td>
                          <span className="text-muted-foreground">
                            {formatDurationMinutes(transaction.duration)}
                          </span>
                        </td>
                        <td>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </td>
                        <td>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTimeBR(transaction.createdAt)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma transacao encontrada para o periodo selecionado.
                </div>
              )}
            </div>
          </div>

          <div className="stat-card space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Integracoes Ativas</h3>
              <p className="text-sm text-muted-foreground">
                Acoes rapidas para cruzar financeiro com a operacao
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/vehicles?status=delivered")}
            >
              Veiculos entregues
              <Badge variant="secondary">{vehicles.filter((vehicle) => vehicle.status === "delivered").length}</Badge>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/vehicles?status=requested")}
            >
              Veiculos aguardando
              <Badge variant="secondary">
                {vehicles.filter((vehicle) => vehicle.status === "requested" || vehicle.status === "in_transit").length}
              </Badge>
            </Button>

            <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/")}>
              Dashboard operacional
              <Badge variant="secondary">{dashboardStats?.totalVehicles ?? 0}</Badge>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
