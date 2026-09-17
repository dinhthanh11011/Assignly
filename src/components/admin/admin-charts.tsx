"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/admin-queries";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Biểu đồ của khu quản trị.
 *
 * Theo đúng quy ước của `report-charts.tsx` — cùng nguồn màu (biến CSS, không
 * mã màu cứng), cùng kiểu tooltip, và `fontSize` phải là **rem**: `html` đặt
 * `font-size: calc(0.9375rem * var(--font-scale))`, nên rem lớn lên theo cần
 * gạt cỡ chữ còn px thì không. Số trần ở `fontSize` cũng bị
 * `scripts/check-ui-rules.sh` chặn thẳng.
 *
 * Không thêm màu mới: token màu mới phải có mặt ở CẢ `:root` lẫn `.dark` trong
 * `globals.css` và qua được `scripts/check-contrast.mjs`.
 */

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 14,
  boxShadow: "var(--shadow-lift)",
  color: "var(--color-foreground)",
  fontSize: "0.875rem",
} as const;

const legendStyle = { fontSize: "0.8125rem" } as const;
const axisTick = { fill: "var(--color-muted-foreground)", fontSize: "0.75rem" } as const;

const EMPTY = <EmptyState size="inline">Chưa có số liệu để vẽ.</EmptyState>;

/** Số lượt ghi mỗi ngày, và bao nhiêu người đã tạo ra chúng. */
export function ActivityChart({ data }: { data: TrendPoint[] }) {
  if (data.every((d) => d.writes === 0)) return EMPTY;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis width="auto" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)" }} />
        <Legend wrapperStyle={legendStyle} />
        <Bar dataKey="writes" name="Lượt ghi" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="writers" name="Người ghi" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Người dùng mới theo ngày. Đường chứ không cột: đây là một xu hướng, không phải các lượng rời rạc cần so. */
export function SignupChart({ data }: { data: TrendPoint[] }) {
  if (data.every((d) => d.signups === 0)) return EMPTY;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis width="auto" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--color-border)" }} />
        <Line
          type="monotone"
          dataKey="signups"
          name="Người mới"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
