"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatMoneyShort, formatMonth } from "@/lib/utils";

const INCOME_COLOR = "var(--income)";
const EXPENSE_COLOR = "var(--expense)";

/** Bảng màu định tính, đồng bộ với tông indigo của app; lặp lại nếu thiếu màu. */
const PALETTE = [
  "oklch(0.56 0.18 270)",
  "oklch(0.66 0.13 205)",
  "oklch(0.62 0.14 162)",
  "oklch(0.76 0.14 68)",
  "oklch(0.62 0.18 20)",
  "oklch(0.6 0.16 320)",
  "oklch(0.7 0.12 140)",
  "oklch(0.5 0.12 245)",
];

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  boxShadow: "var(--shadow-lift)",
  color: "var(--color-foreground)",
  fontSize: 13,
} as const;

const legendStyle = { fontSize: 12 } as const;

// Recharts khai báo formatter rất lỏng (ValueType | undefined), nên ép về số ở đây.
const moneyFormatter = (v: unknown) => formatMoney(Number(v) || 0);

const EMPTY = (
  <p className="py-14 text-center text-sm text-muted-foreground">Chưa có dữ liệu.</p>
);

/** Thu / chi theo từng tháng. */
export function CashflowChart({
  data,
}: {
  data: { month: string; income: number; expense: number }[];
}) {
  if (data.every((d) => d.income === 0 && d.expense === 0)) return EMPTY;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={(m: string) => `T${Number(m.slice(5))}`}
          stroke="var(--color-muted-foreground)"
          fontSize={12}
        />
        <YAxis
          tickFormatter={(v: number) => formatMoneyShort(v)}
          stroke="var(--color-muted-foreground)"
          fontSize={12}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={tooltipStyle}
          labelFormatter={(m) => formatMonth(String(m))}
          formatter={(v, name) => [formatMoney(Number(v) || 0), String(name)]}
        />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
        <Bar dataKey="income" name="Thu" fill={INCOME_COLOR} radius={[6, 6, 0, 0]} />
        <Bar dataKey="expense" name="Chi" fill={EXPENSE_COLOR} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Cơ cấu theo danh mục. */
export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  const chart = data.filter((d) => d.value > 0).slice(0, 8);
  if (chart.length === 0) return EMPTY;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chart}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={96}
          paddingAngle={2}
        >
          {chart.map((d, i) => (
            <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={moneyFormatter} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Xếp hạng chi tiêu theo danh mục, dạng thanh ngang. */
export function CategoryBars({ data }: { data: { name: string; value: number }[] }) {
  const chart = data.filter((d) => d.value > 0).slice(0, 10);
  if (chart.length === 0) return EMPTY;

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chart.length * 40)}>
      <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatMoneyShort(v)}
          stroke="var(--color-muted-foreground)"
          fontSize={12}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          stroke="var(--color-muted-foreground)"
          fontSize={12}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={tooltipStyle}
          formatter={moneyFormatter}
        />
        <Bar dataKey="value" name="Số tiền" radius={[0, 6, 6, 0]}>
          {chart.map((d, i) => (
            <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
