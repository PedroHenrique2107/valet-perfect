import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OccupancyData } from "@/types/valet";

interface OccupancyChartProps {
  data: OccupancyData[];
}

interface OccupancyTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ value: number }>;
}

function CustomTooltip({ active, payload, label }: OccupancyTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
      <p className="mb-1 text-sm font-medium text-foreground">{label}</p>
      <p className="text-lg font-bold text-accent">{payload[0].value}%</p>
      <p className="text-xs text-muted-foreground">Taxa de ocupação</p>
    </div>
  );
}

function getBarColor(value: number): string {
  if (value >= 80) return "hsl(0, 72%, 51%)";
  if (value >= 60) return "hsl(38, 92%, 50%)";
  return "hsl(160, 84%, 39%)";
}

export function OccupancyChart({ data }: OccupancyChartProps) {
  const peakHour = data.reduce(
    (previous, current) => (current.occupancy > previous.occupancy ? current : previous),
    data[0] ?? { hour: "-", occupancy: 0 },
  );

  return (
    <div className="stat-card h-[300px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Ocupação por Horário</h3>
          <p className="text-sm text-muted-foreground">Hoje</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Pico às</p>
          <p className="text-lg font-bold text-foreground">{peakHour.hour}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" vertical={false} />
          <XAxis
            dataKey="hour"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="occupancy" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.occupancy)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
