import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { mockRevenueData, mockTransactions, mockDashboardStats } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const paymentMethodLabels = {
  pix: 'PIX',
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Dinheiro',
  monthly: 'Mensalista',
};

const paymentStatusConfig = {
  pending: { label: 'Pendente', className: 'status-busy' },
  completed: { label: 'Concluído', className: 'status-available' },
  failed: { label: 'Falhou', className: 'status-occupied' },
  refunded: { label: 'Estornado', className: 'bg-muted text-muted-foreground' },
};

export default function FinancialPage() {
  const totalWeekRevenue = mockRevenueData.reduce((acc, d) => acc + d.revenue, 0);
  const avgTicket = totalWeekRevenue / mockRevenueData.reduce((acc, d) => acc + d.transactions, 0);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">
              Acompanhe receitas, despesas e transações
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Período
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Receita Hoje"
            value={`R$ ${mockDashboardStats.todayRevenue.toLocaleString('pt-BR')}`}
            icon={DollarSign}
            trend={{ value: 15.3, isPositive: true }}
            variant="success"
          />
          <StatCard
            title="Receita Semanal"
            value={`R$ ${totalWeekRevenue.toLocaleString('pt-BR')}`}
            icon={TrendingUp}
            trend={{ value: 12.5, isPositive: true }}
            variant="primary"
          />
          <StatCard
            title="Ticket Médio"
            value={`R$ ${avgTicket.toFixed(2)}`}
            icon={Receipt}
            variant="info"
          />
          <StatCard
            title="Transações Hoje"
            value="59"
            icon={CreditCard}
            trend={{ value: 8.2, isPositive: true }}
            variant="default"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart data={mockRevenueData} />
          </div>
          
          {/* Payment Methods Breakdown */}
          <div className="stat-card">
            <h3 className="font-semibold text-foreground mb-4">Por Forma de Pagamento</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">PIX</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">R$ 2.340</p>
                  <p className="text-xs text-muted-foreground">48%</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-info" />
                  <span className="text-sm text-muted-foreground">Cartão de Crédito</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">R$ 1.560</p>
                  <p className="text-xs text-muted-foreground">32%</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <span className="text-sm text-muted-foreground">Cartão de Débito</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">R$ 730</p>
                  <p className="text-xs text-muted-foreground">15%</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm text-muted-foreground">Dinheiro</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">R$ 220</p>
                  <p className="text-xs text-muted-foreground">5%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Transações Recentes</h3>
            <Button variant="ghost" size="sm" className="text-primary">
              Ver todas
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recibo</th>
                  <th>Valor</th>
                  <th>Forma de Pagamento</th>
                  <th>Duração</th>
                  <th>Status</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {mockTransactions.map((transaction) => {
                  const status = paymentStatusConfig[transaction.status];
                  return (
                    <tr key={transaction.id}>
                      <td>
                        <span className="font-mono text-sm">{transaction.receiptNumber}</span>
                      </td>
                      <td>
                        <span className="font-semibold text-foreground">
                          R$ {transaction.amount.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <Badge variant="outline">
                          {paymentMethodLabels[transaction.paymentMethod]}
                        </Badge>
                      </td>
                      <td>
                        <span className="text-muted-foreground">
                          {Math.floor(transaction.duration / 60)}h {transaction.duration % 60}min
                        </span>
                      </td>
                      <td>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </td>
                      <td>
                        <span className="text-sm text-muted-foreground">
                          {transaction.createdAt.toLocaleDateString('pt-BR')}{' '}
                          {transaction.createdAt.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
