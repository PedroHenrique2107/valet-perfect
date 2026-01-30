import { OccupancyData } from '@/types/valet';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface OccupancyChartProps {
  data: OccupancyData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        <p className="text-lg font-bold text-accent">
          {payload[0].value}%
        </p>
        <p className="text-xs text-muted-foreground">Taxa de ocupação</p>
      </div>
    );
  }
  return null;
};

function getBarColor(value: number): string {
  if (value >= 80) return 'hsl(0, 72%, 51%)'; // destructive
  if (value >= 60) return 'hsl(38, 92%, 50%)'; // warning
  return 'hsl(160, 84%, 39%)'; // accent/success
}

export function OccupancyChart({ data }: OccupancyChartProps) {
  const currentHour = new Date().getHours();
  const peakHour = data.reduce((prev, curr) =>
    curr.occupancy > prev.occupancy ? curr : prev
  );

  return (
    <div className="stat-card h-[300px]">
      <div className="flex items-center justify-between mb-4">
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
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(217, 33%, 17%)"
            vertical={false}
          />
          <XAxis
            dataKey="hour"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
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
