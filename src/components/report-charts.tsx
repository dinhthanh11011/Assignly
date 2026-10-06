"use client";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChartColumn, Table2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashflowPoint } from "@/lib/queries";
import { cn, formatMoney, todayKey } from "@/lib/utils";
import { pointHeading, type Slice } from "@/components/reports/chart-data";
import { Button } from "@/components/ui/button";

const INCOME_COLOR = "var(--color-chart-1)";
const EXPENSE_COLOR = "var(--color-chart-2)";

// rem để biểu đồ lớn theo cỡ chữ người dùng chọn.
const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  boxShadow: "var(--shadow-lift)",
  color: "var(--color-foreground)",
  fontSize: "0.875rem",
} as const;
const axisFont = "0.8125rem";

/** Nhãn trục gọn: "60tr", "1,5tr", "800k", "1,2 tỷ" — không có số 0 thừa. */
function axisMoney(v: number) {
  const abs = Math.abs(v);
  const fmt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
  if (abs >= 1e9) return `${fmt(v / 1e9)} tỷ`;
  if (abs >= 1e6) return `${fmt(v / 1e6)}tr`;
  if (abs >= 1e3) return `${Math.round(v / 1e3)}k`;
  return String(v);
}

/**
 * Khung một biểu đồ: tiêu đề + nút "Xem dạng bảng". Bảng là bản thay thế đầy
 * đủ cho người dùng trình đọc màn hình và cho ai muốn đọc số chính xác.
 */
export function ChartPanel({
  id,
  title,
  subtitle,
  table,
  children,
  className,
}: {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  table: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn("min-w-0 rounded-xl border border-border bg-card", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-5 pt-4">
        <div className="min-w-0 flex-[1_1_12rem]">
          <h2 id={`${id}-title`} className="text-body-lg font-semibold">
            {title}
          </h2>
          {subtitle && <p className="text-caption text-muted-foreground">{subtitle}</p>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="-mr-2 px-2.5 text-primary"
          aria-pressed={asTable}
          aria-controls={`${id}-body`}
          onClick={() => setAsTable((v) => !v)}
        >
          {asTable ? <ChartColumn aria-hidden /> : <Table2 aria-hidden />}
          {asTable ? "Xem biểu đồ" : "Xem dạng bảng"}
        </Button>
      </div>
      <div id={`${id}-body`} className="px-5 pb-5 pt-3">
        {asTable ? table : children}
      </div>
    </section>
  );
}

/** Bảng dữ liệu đơn giản, cột số canh phải, chữ số đều. */
export function DataTable({
  caption,
  head,
  rows,
  foot,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
  foot?: (string | number)[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[16rem] border-collapse text-body">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-left text-caption text-muted-foreground">
            {head.map((h, i) => (
              <th key={h} scope="col" className={cn("whitespace-nowrap py-2 pr-3 font-semibold", i > 0 && "pl-3 pr-0 text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-border last:border-0">
              {r.map((c, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="py-2 pr-3 text-left font-normal [overflow-wrap:anywhere]">
                    {c}
                  </th>
                ) : (
                  <td key={i} className="num whitespace-nowrap py-2 pl-3 text-right">
                    {c}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              {foot.map((c, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="py-2 pr-3 text-left">
                    {c}
                  </th>
                ) : (
                  <td key={i} className="num whitespace-nowrap py-2 pl-3 text-right">
                    {c}
                  </td>
                )
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/* ─── Dòng tiền ───────────────────────────────────────────────────────────── */

function SeriesLegend({ lines = false }: { lines?: boolean }) {
  // Đường: thu nét liền, chi nét đứt — phân biệt được cả khi không thấy màu.
  const swatch = (color: string, dashed: boolean) =>
    lines ? (
      <svg aria-hidden width="20" height="8" className="shrink-0">
        <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2.5" strokeDasharray={dashed ? "5 3" : undefined} />
      </svg>
    ) : (
      <span aria-hidden className="size-3 shrink-0 rounded-sm" style={{ background: color }} />
    );
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
      <li className="flex items-center gap-1.5">
        {swatch(INCOME_COLOR, false)}
        <ArrowDownLeft className="size-4" aria-hidden /> Tiền vào
      </li>
      <li className="flex items-center gap-1.5">
        {swatch(EXPENSE_COLOR, true)}
        <ArrowUpRight className="size-4" aria-hidden /> Tiền ra
      </li>
    </ul>
  );
}

type CumPoint = CashflowPoint & { incomeCum: number; expenseCum: number };

/**
 * Khoảng chia theo NGÀY: hai đường CỘNG DỒN. 31 ngày × 2 cột trên màn 375px
 * chỉ còn vạch 1px, và một ngày nhận lương kéo trục lên tới mức mọi ngày chi
 * thành vạch phẳng. Cộng dồn thì thấy được nhịp tiêu và chỗ chi vượt thu.
 * Ngày chưa tới bị cắt bỏ — vẽ tiếp thành đường phẳng là nói dối.
 */
function CumulativeChart({ data, summary }: { data: CashflowPoint[]; summary: string }) {
  const today = todayKey();
  const points = data
    .filter((p) => p.key <= today)
    .reduce<CumPoint[]>((acc, p) => {
      const prev = acc[acc.length - 1];
      acc.push({
        ...p,
        incomeCum: (prev?.incomeCum ?? 0) + p.income,
        expenseCum: (prev?.expenseCum ?? 0) + p.expense,
      });
      return acc;
    }, []);
  return (
    <div className="space-y-3">
      <SeriesLegend lines />
      <div role="img" aria-label={summary} className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              interval="equidistantPreserveStart"
              minTickGap={16}
              tickMargin={8}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              tick={{ fill: "var(--color-muted-foreground)" }}
              fontSize={axisFont}
            />
            <YAxis
              tickFormatter={axisMoney}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-muted-foreground)" }}
              fontSize={axisFont}
              width="auto"
            />
            <Tooltip
              cursor={{ stroke: "var(--color-border-strong)", strokeWidth: 1 }}
              contentStyle={tooltipStyle}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as CumPoint | undefined;
                return p ? pointHeading(p) : "";
              }}
              formatter={(v, name, item) => {
                const p = item.payload as CumPoint;
                const day = name === "Tiền vào" ? p.income : p.expense;
                return [`${formatMoney(Number(v) || 0)} (hôm đó ${formatMoney(day)})`, `${String(name)} cộng dồn`];
              }}
            />
            <Line isAnimationActive={false} type="monotone" dataKey="incomeCum" name="Tiền vào" stroke={INCOME_COLOR} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-card)" }} />
            <Line isAnimationActive={false} type="monotone" dataKey="expenseCum" name="Tiền ra" stroke={EXPENSE_COLOR} strokeWidth={2.5} strokeDasharray="6 4" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-card)" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Thu / chi theo từng cột thời gian (ngày hoặc tháng — server quyết, xem
 * `getReport`). Cột chứ không đường: mỗi mốc là một tổng rời, và cần so thu với
 * chi trong cùng mốc. Dưới 4 mốc thì biểu đồ không nói được gì hơn ô số, nên
 * hiện danh sách thay vì vẽ.
 */
export function CashflowChart({
  data,
  summary,
  granularity,
}: {
  data: CashflowPoint[];
  summary: string;
  granularity: "day" | "month";
}) {
  if (granularity === "day" && data.filter((p) => p.key <= todayKey()).length >= 4) {
    return <CumulativeChart data={data} summary={summary} />;
  }
  if (data.length < 4) {
    return (
      <ul className="divide-y divide-border">
        {data.map((p) => (
          <li key={p.key} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2.5">
            <span className="text-body">{pointHeading(p)}</span>
            <span className="num text-body">
              <span className="text-income">+{formatMoney(p.income)}</span>
              <span className="mx-1.5 text-muted-foreground">·</span>
              <span className="text-expense">−{formatMoney(p.expense)}</span>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      <SeriesLegend />
      <div role="img" aria-label={summary} className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 4, top: 8, bottom: 0 }} barGap={2} barCategoryGap="18%">
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              interval="equidistantPreserveStart"
              minTickGap={12}
              tickMargin={8}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              tick={{ fill: "var(--color-muted-foreground)" }}
              fontSize={axisFont}
            />
            <YAxis
              tickFormatter={axisMoney}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-muted-foreground)" }}
              fontSize={axisFont}
              width="auto"
            />
            <Tooltip
              cursor={{ fill: "var(--color-sunken)" }}
              contentStyle={tooltipStyle}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as CashflowPoint | undefined;
                return p ? pointHeading(p) : "";
              }}
              formatter={(v, name) => [formatMoney(Number(v) || 0), String(name)]}
            />
            <Bar isAnimationActive={false} dataKey="income" name="Tiền vào" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar isAnimationActive={false} dataKey="expense" name="Tiền ra" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Cơ cấu theo danh mục ────────────────────────────────────────────────── */

/** Biểu đồ vòng — chỉ nhận ≤5 lát đã gộp bằng `foldSlices`. Tổng ở giữa vòng. */
export function CategoryDonut({ slices, total, summary }: { slices: Slice[]; total: number; summary: string }) {
  return (
    <div role="img" aria-label={summary} className="relative mx-auto aspect-square w-full max-w-60">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="64%"
            outerRadius="100%"
            paddingAngle={slices.length > 1 ? 1.5 : 0}
            stroke="var(--color-card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell key={s.name} fill={s.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [formatMoney(Number(v) || 0), String(name)]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-caption text-muted-foreground">Tổng</span>
        <span className="num px-6 text-body font-semibold">{formatMoney(total)}</span>
      </div>
    </div>
  );
}

/**
 * Xếp hạng theo danh mục, thanh ngang giảm dần (skill: so sánh hạng mục → bar
 * ngang, luôn sắp giảm dần). Tên + số + % luôn in ra; màu chỉ để nối với lát
 * tròn tương ứng.
 */
export function CategoryBarList({
  rows,
  total,
  limit = 8,
}: {
  rows: { name: string; value: number; color?: string }[];
  total: number;
  limit?: number;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, limit);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      <ul className="space-y-3">
        {shown.map((r) => (
          <li key={r.name}>
            {/* Xuống dòng thay vì cắt tên: ở "Chữ lớn" số tiền rớt xuống dưới. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="flex min-w-0 flex-[1_1_8rem] items-center gap-2">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: r.color ?? "var(--color-primary)" }} />
                <span className="min-w-0 truncate text-body">{r.name}</span>
              </span>
              <span className="num ml-auto shrink-0 text-body font-semibold">
                {formatMoney(r.value)}
                {total > 0 && (
                  <span className="ml-1.5 text-caption font-normal text-muted-foreground">
                    {Math.round((r.value / total) * 100)}%
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(1, (r.value / max) * 100)}%`, background: r.color ?? "var(--color-primary)" }}
              />
            </div>
          </li>
        ))}
      </ul>
      {rows.length > limit && (
        <Button variant="ghost" size="sm" className="mt-2 -ml-2 px-2 text-primary" onClick={() => setAll((v) => !v)}>
          {all ? "Thu gọn" : `Xem thêm ${rows.length - limit} loại`}
        </Button>
      )}
    </div>
  );
}
