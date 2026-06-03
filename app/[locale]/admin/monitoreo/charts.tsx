"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SignupRow = { date: string; count: number };

/**
 * Mini gráfico de barras para tendencia de registros nuevos. Cliente porque
 * Recharts depende de window/SVG en hidratación. Tematizado con --color-arena
 * para encajar con el resto del sitio.
 */
export function SignupsTrendChart({ data }: { data: SignupRow[] }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="var(--color-muted-foreground)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(data.length / 8)}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in oklch, var(--color-arena) 8%, transparent)" }}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-muted-foreground)" }}
          />
          <Bar dataKey="count" fill="var(--color-arena)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type PointsBucket = { range: string; users: number };

/**
 * Histograma de distribución de puntos por usuario. Eje X = bucket de puntos
 * (ej. "0", "1-5", "6-10"…), eje Y = cuántos usuarios caen en ese bucket.
 */
export function PointsDistributionChart({ data }: { data: PointsBucket[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="range"
            stroke="var(--color-muted-foreground)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in oklch, var(--color-arena) 8%, transparent)" }}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-muted-foreground)" }}
          />
          <Bar dataKey="users" fill="var(--color-arena)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
