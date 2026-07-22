"use client";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  Done: "oklch(0.7 0.17 155)",
  Assigned: "oklch(0.62 0.19 288)",
  Unassigned: "oklch(0.78 0.16 75)",
  Missed: "oklch(0.62 0.23 25)",
};

export function StatusPie({
  data,
}: {
  data: { PENDING: number; ASSIGNED: number; DONE: number; MISSED: number };
}) {
  const chart = [
    { name: "Done", value: data.DONE },
    { name: "Assigned", value: data.ASSIGNED },
    { name: "Unassigned", value: data.PENDING },
    { name: "Missed", value: data.MISSED },
  ].filter((d) => d.value > 0);

  if (chart.length === 0)
    return <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={chart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {chart.map((d) => (
            <Cell key={d.name} fill={STATUS_COLORS[d.name]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            color: "var(--color-foreground)",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MemberLoadChart({
  data,
}: {
  data: { name: string; assigned: number; done: number; missed: number }[];
}) {
  if (data.length === 0)
    return <p className="py-10 text-center text-sm text-muted-foreground">No members.</p>;

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
        <XAxis type="number" allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={12} />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          stroke="var(--color-muted-foreground)"
          fontSize={12}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            color: "var(--color-foreground)",
          }}
        />
        <Legend />
        <Bar dataKey="assigned" name="Assigned" fill="oklch(0.62 0.19 288)" radius={[0, 6, 6, 0]} />
        <Bar dataKey="done" name="Done" fill="oklch(0.7 0.17 155)" radius={[0, 6, 6, 0]} />
        <Bar dataKey="missed" name="Missed" fill="oklch(0.62 0.23 25)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
