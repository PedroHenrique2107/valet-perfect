import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrencyBRL } from "@/lib/format";
import type { RevenueData } from "@/types/valet";

interface RevenueChartProps {
  data: RevenueData[];
  title?: string;
  subtitle?: string;
  summaryNote?: string;
}

interface RevenueTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ value: number; payload: RevenueData }>;
}

function formatCompactAxisValue(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  if (value >= 100) {
    return Math.round(value).toString();
  }

  if (value >= 10) {
    return value.toFixed(0);
  }

  return value.toFixed(0);
}

function CustomTooltip({ active, payload, label }: RevenueTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
      <p className="mb-1 text-sm font-medium text-foreground">{label}</p>
      <p className="text-lg font-bold text-primary">{formatCurrencyBRL(payload[0].value)}</p>
      <p className="text-xs text-muted-foreground">{payload[0].payload.transactions} transacoes</p>
    </div>
  );
}

export function RevenueChart({
  data,
  title = "Receita Semanal",
  subtitle = "Ultimos 7 dias",
  summaryNote = "+12.5% vs semana anterior",
}: RevenueChartProps) {
  return (
    <div className="stat-card h-[300px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">
            {formatCurrencyBRL(data.reduce((acc, item) => acc + item.revenue, 0))}
          </p>
          <p className="text-sm text-success">{summaryNote}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            minTickGap={18}
          />
          <YAxis
            width={44}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            tickFormatter={formatCompactAxisValue}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(217, 91%, 60%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
