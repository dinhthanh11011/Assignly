import type { CashflowPoint } from "@/lib/queries";
import { formatDayHeading, formatMonth } from "@/lib/utils";

/* Phần THUẦN của biểu đồ báo cáo (không "use client") — trang server gọi được. */

/* ─── Màu ─────────────────────────────────────────────────────────────────────
   Chỉ dùng token chart-1…6 (globals.css, đã qua check:contrast cả hai theme).
   Thứ tự cố định, không xoay vòng; chart-6 (slate) luôn là "Khác".
   Thu/chi KHÔNG dùng cặp xanh lá–đỏ: đặt cạnh nhau thì người mù màu đỏ-lục
   không tách được. Chiều tiền đã có nhãn + mũi tên ở chú thích và bảng. */
export const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const;
export const OTHER_COLOR = "var(--color-chart-6)";

export type Slice = { name: string; value: number; color: string; members?: number };

/**
 * Gộp danh mục cho biểu đồ tròn: tối đa 5 lát (skill: donut chỉ khi ≤5 phần).
 * Nhiều hơn thì giữ 4 lớn nhất và gộp phần còn lại thành "Khác".
 * Trả thêm màu cho TỪNG danh mục gốc, để danh sách thanh ngang tô cùng màu với
 * lát tương ứng (màu đi theo danh mục, không theo vị trí).
 */
export function foldSlices<T extends { name: string; value: number }>(data: T[], max = 5) {
  const rows = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const keep = rows.length <= max ? rows.length : max - 1;
  const slices: Slice[] = rows.slice(0, keep).map((d, i) => ({ ...d, color: CHART_COLORS[i] }));
  const rest = rows.slice(keep);
  if (rest.length > 0) {
    slices.push({
      name: "Khác",
      value: rest.reduce((s, d) => s + d.value, 0),
      color: OTHER_COLOR,
      members: rest.length,
    });
  }
  const colorOf = (name: string) => slices.find((s) => s.name === name)?.color ?? OTHER_COLOR;
  return { slices, rows: rows.map((r) => ({ ...r, color: colorOf(r.name) })) };
}

/** "Thứ Ba, 05/08" cho cột ngày; "Tháng 8/2026" cho cột tháng. */
export function pointHeading(point: CashflowPoint) {
  return point.key.length > 7 ? formatDayHeading(point.key) : formatMonth(point.key);
}
