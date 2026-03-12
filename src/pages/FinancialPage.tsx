import {
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useDashboardStatsQuery,
  useRevenueDataQuery,
  useTransactionsQuery,
  useVehiclesQuery,
} from "@/hooks/useValetData";
import { formatCurrencyBRL, formatDateTimeBR, formatDurationMinutes } from "@/lib/format";
import type { PaymentMethod, PaymentStatus } from "@/types/valet";

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

function isSameDay(left: Date, right: Date) {
  return (
    left.getDate() === right.getDate() &&
    left.getMonth() === right.getMonth() &&
    left.getFullYear() === right.getFullYear()
  );
}

export default function FinancialPage() {
  const navigate = useNavigate();
  const { data: dashboardStats } = useDashboardStatsQuery();
  const { data: revenueData = [] } = useRevenueDataQuery();
  const { data: transactions = [] } = useTransactionsQuery();
  const { data: vehicles = [] } = useVehiclesQuery();

  const completedTransactions = useMemo(
    () =>
      [...transactions]
        .filter((transaction) => transaction.status === "completed")
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    [transactions],
  );

  const today = new Date();
  const todayTransactions = completedTransactions.filter((transaction) =>
    isSameDay(transaction.createdAt, today),
  );
  const pendingTransactions = transactions.filter((transaction) => transaction.status === "pending");

  const totalWeekRevenue = revenueData.reduce((acc, item) => acc + item.revenue, 0);
  const transactionCount = completedTransactions.length;
  const avgTicket = transactionCount > 0 ? totalWeekRevenue / transactionCount : 0;
  const todayRevenue = todayTransactions.reduce((acc, transaction) => acc + transaction.amount, 0);

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
      share: totalWeekRevenue > 0 ? (summary.amount / totalWeekRevenue) * 100 : 0,
    }))
    .filter((item) => item.amount > 0 || item.count > 0)
    .sort((left, right) => right.amount - left.amount);

  const handleExport = () => {
    const rows = [
      ["recibo", "placa", "cliente", "valor", "pagamento", "status", "duracao_min", "criado_em"],
      ...transactions.map((transaction) => {
        const vehicle = vehicles.find((item) => item.id === transaction.vehicleId);
        return [
          transaction.receiptNumber,
          vehicle?.plate ?? "-",
          vehicle?.clientName ?? "-",
          transaction.amount.toFixed(2),
          paymentMethodLabels[transaction.paymentMethod],
          paymentStatusConfig[transaction.status].label,
          String(transaction.duration),
          formatDateTimeBR(transaction.createdAt),
        ];
      }),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
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
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/")}>
              <Calendar className="h-4 w-4" />
              Ultimos 7 dias
            </Button>
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
            title="Receita Hoje"
            value={formatCurrencyBRL(todayRevenue || dashboardStats?.todayRevenue || 0)}
            icon={DollarSign}
            trend={{ value: todayTransactions.length, isPositive: true }}
            variant="success"
          />
          <StatCard
            title="Receita Semanal"
            value={formatCurrencyBRL(totalWeekRevenue)}
            icon={TrendingUp}
            trend={{ value: transactionCount, isPositive: true }}
            variant="primary"
          />
          <StatCard title="Ticket Medio" value={formatCurrencyBRL(avgTicket)} icon={Receipt} variant="info" />
          <StatCard
            title="Transacoes Pendentes"
            value={pendingTransactions.length}
            icon={CreditCard}
            trend={{ value: transactionCount, isPositive: true }}
            variant={pendingTransactions.length > 0 ? "warning" : "default"}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart data={revenueData} />
          </div>

          <div className="stat-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">Por Forma de Pagamento</h3>
                <p className="text-sm text-muted-foreground">Resumo pelas transacoes concluidas</p>
              </div>
              <Badge variant="outline">{transactionCount} pagamentos</Badge>
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
                  Pagamentos ligados ao fluxo de saida e cadastro de veiculos
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
                  {transactions.map((transaction) => {
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
