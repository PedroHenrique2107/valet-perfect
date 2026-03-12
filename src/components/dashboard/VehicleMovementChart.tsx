import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface VehicleMovementPoint {
  label: string;
  entries: number;
  exits: number;
}

interface VehicleMovementChartProps {
  data: VehicleMovementPoint[];
  title?: string;
  subtitle?: string;
}

export function VehicleMovementChart({
  data,
  title = "Movimentacao de Veiculos",
  subtitle = "Shopping Center Norte",
}: VehicleMovementChartProps) {
  return (
    <div className="stat-card h-[300px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">
            {data.reduce((acc, item) => acc + item.entries + item.exits, 0)}
          </p>
          <p className="text-sm text-muted-foreground">movimentos no periodo</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            minTickGap={18}
          />
          <YAxis
            width={32}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(217 33% 17% / 0.18)" }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
            }}
          />
          <Legend />
          <Bar dataKey="entries" name="Entradas" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="exits" name="Saidas" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
