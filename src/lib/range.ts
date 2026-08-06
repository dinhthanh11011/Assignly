import {
  currentMonth,
  dateFromKey,
  dateKey,
  daysInRange,
  formatDate,
  formatMonth,
  monthRange,
  shiftMonth,
} from "@/lib/utils";

/**
 * Khoảng thời gian của trang Xem lại — MỘT nguồn sự thật, dùng chung cho server
 * (truy vấn) và client (bộ chọn, nhãn).
 *
 * Vì sao không chỉ là `?range=3|6|12` như bản cũ: ba con số đó trả lời được đúng
 * một câu hỏi ("mấy tháng gần đây"), còn câu người dùng hay hỏi nhất lại là
 * "THÁNG 6 tôi tiêu vào những gì" — mà bản cũ không có cách nào hỏi. Nay có ba
 * kiểu, cùng quy về một khoảng ngày duy nhất:
 *
 *   · `?month=2026-06`            → đúng một tháng, chuyển tháng được bằng ‹ ›
 *   · `?range=3|6|12`             → N tháng gần đây
 *   · `?from=…&to=…`              → tự chọn ngày đầu / ngày cuối
 *
 * MẶC ĐỊNH LÀ THÁNG NÀY, không phải "6 tháng gần đây" như bản trước: mở trang
 * Xem lại ra là để soi tháng mình đang sống trong đó, và ở một tháng thì biểu đồ
 * chia theo NGÀY nên nhìn ra được ngay tiêu dồn vào hôm nào. Muốn xem xu hướng
 * dài hơi thì vẫn còn nguyên ba chip 3 / 6 / 12 tháng.
 *
 * Mọi thứ dưới đây là hàm thuần trên chuỗi khoá ngày ("2026-08-05"), không chạm
 * `Date` giờ địa phương — xem kỷ luật UTC-midnight ở đầu phần ngày tháng của
 * utils.ts.
 */

export type RangeMode = "month" | "months" | "custom";

export type ReportRange = {
  mode: RangeMode;
  /** Chỉ có khi mode = "month". */
  month?: string;
  /** Chỉ có khi mode = "months": 3 / 6 / 12. */
  months?: number;
  /** Khoá ngày đầu và ngày cuối, luôn có với mọi mode. */
  from: string;
  until: string;
};

export type RangeParams = { range?: string; month?: string; from?: string; to?: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
export const MONTH_PRESETS = [3, 6, 12] as const;

/** N tháng gần đây, tính tới hết tháng này. */
function lastMonths(months: number): ReportRange {
  const end = currentMonth();
  return {
    mode: "months",
    months,
    from: dateKey(monthRange(shiftMonth(end, -(months - 1))).from),
    until: dateKey(monthRange(end).until),
  };
}

function oneMonth(month: string): ReportRange {
  const { from, until } = monthRange(month);
  return { mode: "month", month, from: dateKey(from), until: dateKey(until) };
}

/**
 * Đọc khoảng thời gian từ query string. Tham số rác không bao giờ làm trang lỗi
 * — luôn lùi về tháng này, vì URL này người dùng có thể tự sửa hoặc chia sẻ.
 *
 * Thứ tự ưu tiên: ngày tự chọn → một tháng → N tháng gần đây → tháng này.
 */
export function resolveRange(sp: RangeParams): ReportRange {
  if (sp.from && sp.to && DAY.test(sp.from) && DAY.test(sp.to)) {
    // Gõ ngược hai đầu (hoặc chọn ngược trong sheet) thì đổi chỗ, chứ không trả
    // về khoảng rỗng rồi báo "chưa có số liệu" — đó là câu trả lời sai.
    const [from, until] = sp.from <= sp.to ? [sp.from, sp.to] : [sp.to, sp.from];
    return { mode: "custom", from, until };
  }
  if (sp.month && MONTH.test(sp.month)) return oneMonth(sp.month);

  const months = MONTH_PRESETS.find((m) => String(m) === sp.range);
  return months ? lastMonths(months) : oneMonth(currentMonth());
}

/** Khoảng cho một tháng cụ thể — dùng khi bấm ‹ › trong chế độ từng tháng. */
export function monthAsRange(month: string): ReportRange {
  return oneMonth(month);
}

/** Khoảng "N tháng gần đây" — dùng khi bấm chip 3 / 6 / 12 tháng. */
export function monthsAsRange(months: number): ReportRange {
  return lastMonths(months);
}

/** Query string của một khoảng: chỉ giữ đúng tham số của mode đó. */
export function rangeParams(r: ReportRange): Record<string, string | null> {
  return {
    range: r.mode === "months" ? String(r.months) : null,
    month: r.mode === "month" ? r.month! : null,
    from: r.mode === "custom" ? r.from : null,
    to: r.mode === "custom" ? r.until : null,
  };
}

/** Tên khoảng, đủ ngắn để làm nhãn thẻ: "Tháng 6/2026" / "6 tháng gần đây". */
export function rangeLabel(r: ReportRange): string {
  if (r.mode === "month") return formatMonth(r.month!);
  if (r.mode === "months") return `${r.months} tháng gần đây`;
  return `${formatDate(r.from)} – ${formatDate(r.until)}`;
}

/** Câu nói rõ đang xem từ ngày nào tới ngày nào — luôn hiện dưới bộ chọn. */
export function rangeSentence(r: ReportRange): string {
  const days = daysInRange(dateFromKey(r.from), dateFromKey(r.until));
  return `Đang tính từ ${formatDate(r.from)} đến ${formatDate(r.until)} — ${days} ngày`;
}
