"use client";
import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Table2 } from "lucide-react";
import type { TrendPoint } from "@/lib/admin-queries";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/**
 * Biểu đồ chuỗi thời gian của khu quản trị.
 *
 * · Màu chỉ lấy từ `--color-chart-*` (đổi theo theme, đã qua validator).
 * · `fontSize` bằng rem để lớn theo cần gạt cỡ chữ (px trần bị check-ui-rules chặn).
 * · Mỗi biểu đồ có câu tóm tắt + nút "Xem dạng bảng" với bảng thật — người
 *   dùng screen reader và người cần con số chính xác không phải dò tooltip.
 */

type MetricKey = "writes" | "writers" | "signups";

export type TrendMetric = {
  key: MetricKey;
  /** Tên chuỗi, ví dụ "Lượt ghi". */
  label: string;
  /** Đơn vị trong tooltip, ví dụ "lượt ghi". */
  unit: string;
  color: string;
};

const nf = new Intl.NumberFormat("vi-VN");
const axisTick = { fill: "var(--color-muted-foreground)", fontSize: "0.8125rem" } as const;

function fullDate(key: string) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

export function TrendCard({
  data,
  metrics,
  caption,
}: {
  data: TrendPoint[];
  /** Một hoặc nhiều chuỗi; nhiều chuỗi thì có nút chọn chuỗi đang xem. */
  metrics: TrendMetric[];
  /** Mô tả bảng số liệu cho screen reader. */
  caption: string;
}) {
  const [active, setActive] = useState<MetricKey>(metrics[0].key);
  const [asTable, setAsTable] = useState(false);
  // useId có thể chứa ký tự không hợp lệ trong url(#…) — chỉ giữ chữ/số.
  const gradId = `trend-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const tableId = `${gradId}-table`;
  const m = metrics.find((x) => x.key === active) ?? metrics[0];

  const total = data.reduce((s, p) => s + p[m.key], 0);
  const peak = data.reduce((best, p) => (p[m.key] > best[m.key] ? p : best), data[0]);
  const summary =
    total === 0
      ? `Chưa có ${m.unit} nào trong ${data.length} ngày qua.`
      : `${nf.format(total)} ${m.unit} trong ${data.length} ngày; nhiều nhất ${nf.format(peak[m.key])} vào ${fullDate(peak.key)}.`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {metrics.length > 1 ? (
          <div role="group" aria-label="Chọn số liệu" className="inline-flex rounded-lg bg-sunken p-1">
            {metrics.map((x) => (
              <button
                key={x.key}
                type="button"
                aria-pressed={x.key === active}
                onClick={() => setActive(x.key)}
                className={cn(
                  "focus-ring min-h-10 cursor-pointer rounded-md px-3 text-label transition-colors duration-150",
                  x.key === active
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {x.label}
              </button>
            ))}
          </div>
        ) : (
          <Legend metric={m} total={total} />
        )}
        <button
          type="button"
          aria-expanded={asTable}
          aria-controls={tableId}
          onClick={() => setAsTable((v) => !v)}
          className="focus-ring inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-body font-medium text-primary transition-colors duration-150 hover:bg-sunken"
        >
          {asTable ? <BarChart3 className="size-5" aria-hidden /> : <Table2 className="size-5" aria-hidden />}
          {asTable ? "Xem biểu đồ" : "Xem dạng bảng"}
        </button>
      </div>

      {metrics.length > 1 && <Legend metric={m} total={total} />}
      <p className="text-caption text-muted-foreground">{summary}</p>

      {asTable ? (
        <div id={tableId} className="max-h-80 overflow-y-auto rounded-lg border border-border">
          <table className="w-full border-separate border-spacing-0 text-body">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 border-b border-border bg-sunken px-3 py-2 text-left text-label text-muted-foreground">
                  Ngày
                </th>
                {metrics.map((x) => (
                  <th
                    key={x.key}
                    scope="col"
                    className="sticky top-0 border-b border-border bg-sunken px-3 py-2 text-right text-label text-muted-foreground"
                  >
                    {x.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((p) => (
                <tr key={p.key}>
                  <th scope="row" className="border-b border-border px-3 py-2 text-left font-normal">
                    {fullDate(p.key)}
                  </th>
                  {metrics.map((x) => (
                    <td key={x.key} className="num border-b border-border px-3 py-2 text-right">
                      {nf.format(p[x.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : total === 0 ? (
        <EmptyState size="inline" icon={BarChart3}>
          Chưa có số liệu để vẽ.
        </EmptyState>
      ) : (
        <div role="img" aria-label={`Biểu đồ vùng: ${summary}`} className="h-56 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={m.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={m.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                width="auto"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickFormatter={(v: number) => nf.format(v)}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-border-strong)", strokeDasharray: "4 4" }}
                content={({ active: on, payload }) => {
                  const p = payload?.[0]?.payload as TrendPoint | undefined;
                  if (!on || !p) return null;
                  return (
                    <div className="rounded-lg border border-border bg-card px-3 py-2 text-caption shadow-lift">
                      <p className="text-muted-foreground">{fullDate(p.key)}</p>
                      <p className="num mt-0.5 text-body font-semibold text-foreground">
                        {nf.format(p[m.key])} {m.unit}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                isAnimationActive={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: m.color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Legend({ metric, total }: { metric: TrendMetric; total: number }) {
  return (
    <p className="flex items-center gap-2 text-label">
      <span aria-hidden className="h-1 w-4 rounded-full" style={{ background: metric.color }} />
      {metric.label}
      <span className="num font-normal text-muted-foreground">· tổng {nf.format(total)}</span>
    </p>
  );
}

/** Thanh tỉ lệ ngang (đã dùng tính năng / tổng người). Có số kèm, không chỉ độ dài. */
export function ShareBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-body">{label}</span>
        <span className="num shrink-0 text-body">
          <span className="font-semibold">{pct}%</span>
          <span className="text-muted-foreground"> · {nf.format(value)} người</span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-chart-1" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
