import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Mã mời ngẫu nhiên, an toàn cho URL. */
export function generateInviteCode(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Danh mục hiển thị thay cho tên giao dịch. Giao dịch nhiều danh mục hiện dạng
 * "Ăn uống + Nhà cửa"; danh mục đầu tiên (icon) là danh mục chính.
 */
export function categoryLabel(t: { categories: { category: { name: string } }[] }) {
  const names = t.categories.map((c) => c.category.name);
  return names.length > 0 ? names.join(" + ") : "Chưa ghi là gì";
}

// ─── Ngày tháng ───────────────────────────────────────────────────────────────
// Mọi ngày trong app đều là "date-only" lưu ở mốc nửa đêm UTC, nên khi hiển thị
// luôn phải ép timeZone: "UTC" để không bị lệch một ngày.

/** Đưa một Date về mốc nửa đêm UTC (chỉ giữ phần ngày). */
export function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** "2026-08-05" → Date nửa đêm UTC. */
export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

/** Date → "2026-08-05". */
export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Hôm nay, ở mốc nửa đêm UTC. */
export function today(): Date {
  return toDateOnly(new Date());
}

/** Cộng/trừ ngày vào một Date "date-only". */
export function addDays(d: Date, days: number): Date {
  return new Date(toDateOnly(d).getTime() + days * 86_400_000);
}

/** "2026-08-05" + 30 ngày → "2026-09-04". Bỏ trống thì tính từ hôm nay. */
export function shiftDateKey(key: string, days: number): string {
  return dateKey(addDays(key ? dateFromKey(key) : today(), days));
}

/** "2026-08" → ngày đầu và ngày cuối của tháng đó (UTC). */
export function monthRange(month: string): { from: Date; until: Date } {
  const [y, m] = month.split("-").map(Number);
  return {
    from: new Date(Date.UTC(y, m - 1, 1)),
    until: new Date(Date.UTC(y, m, 0)),
  };
}

/** Tháng hiện tại dạng "2026-08". */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Dịch tháng "2026-08" đi `delta` tháng. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-08" → "Tháng 8/2026". */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `Tháng ${Number(m)}/${y}`;
}

/** Số ngày của một khoảng, tính CẢ hai đầu ("mùng 1 tới mùng 1" = 1 ngày). */
export function daysInRange(from: Date, until: Date): number {
  return Math.round((toDateOnly(until).getTime() - toDateOnly(from).getTime()) / 86_400_000) + 1;
}

/** Mọi ngày trong khoảng, dạng khoá "2026-08-05". */
export function dayKeysBetween(from: Date, until: Date): string[] {
  const out: string[] = [];
  for (let d = toDateOnly(from); d <= toDateOnly(until); d = addDays(d, 1)) out.push(dateKey(d));
  return out;
}

/** Mọi tháng mà khoảng này chạm tới, dạng khoá "2026-08". */
export function monthKeysBetween(from: Date, until: Date): string[] {
  const out: string[] = [];
  const last = dateKey(until).slice(0, 7);
  for (let m = dateKey(from).slice(0, 7); ; m = shiftMonth(m, 1)) {
    out.push(m);
    if (m >= last) break;
  }
  return out;
}

/** Nhãn cột thứ trong lịch, BẮT ĐẦU TỪ THỨ HAI như lịch giấy tiếng Việt. */
export const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

/**
 * Các tuần của một tháng, mỗi tuần đúng 7 ô, tuần bắt đầu từ Thứ Hai. Ô rơi ra
 * ngoài tháng là `null` — lịch cố tình KHÔNG hiện ngày của tháng bên cạnh: một
 * ô mờ vẫn bấm được là cái bẫy quen thuộc của lịch, và ở đây bấm nhầm nghĩa là
 * xem sai tháng mà không hiểu vì sao.
 */
export function monthWeeks(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // 0 = Thứ Hai
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= total; d++) cells.push(dateKey(new Date(Date.UTC(y, m - 1, d))));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "05/08/2026". */
export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? dateFromKey(d) : d;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Thứ Ba, 05/08" — dùng cho tiêu đề nhóm ngày. */
export function formatDayHeading(d: Date | string) {
  const date = typeof d === "string" ? dateFromKey(d) : d;
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

/** "05/08" — nhãn ngày ngắn cho ô lịch và trục biểu đồ. */
export function formatDayShort(d: Date | string) {
  const date = typeof d === "string" ? dateFromKey(d) : d;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

/** "Thứ Ba" — dùng khi ngày đã hiện ở chỗ khác. */
export function formatWeekday(d: Date | string) {
  const date = typeof d === "string" ? dateFromKey(d) : d;
  return date.toLocaleDateString("vi-VN", { weekday: "long", timeZone: "UTC" });
}

/** Số ngày còn lại tới `due` (âm = đã quá hạn). */
export function daysUntil(due: Date): number {
  return Math.round((toDateOnly(due).getTime() - today().getTime()) / 86_400_000);
}

// ─── Tiền tệ ──────────────────────────────────────────────────────────────────
const vnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/** 1250000 → "1.250.000 ₫". */
export function formatMoney(amount: number): string {
  return `${vnd.format(Math.round(amount))} ₫`;
}

/** 1250000 → "1,25 tr" — dùng cho nhãn biểu đồ và chỗ hẹp. */
export function formatMoneyShort(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)} tỷ`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)} tr`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return `${sign}${vnd.format(abs)}`;
}

/* KHÔNG THÊM BẬC RÚT GỌN NGẮN HƠN `formatMoneyShort` NỮA.
   Đã từng có một bậc "1,2tr / 125k" dựng riêng cho ô lịch tháng, và nó thất bại:
   một ô lịch rộng 1/7 màn hình, mà người dùng tự tăng được cỡ chữ lên ~19px, nên
   "−2,4tr" vẫn bị cắt thành "−2…" — một con số cắt dở còn tệ hơn không có số, vì
   nó trông như thông tin mà đọc không ra. Lịch giờ dùng vạch cao thấp để so sánh
   và in số chính xác thành câu ở dưới (xem month-calendar.tsx). Chỗ nào hẹp quá
   để chứa số thì thứ cần đổi là bố cục, không phải cỡ chữ hay cách viết số. */

/** Bỏ mọi ký tự không phải chữ số khỏi chuỗi nhập tiền → số. */
export function parseMoney(input: string): number {
  const digits = input.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/** Định dạng lại chuỗi đang gõ thành "1.250.000" (không kèm ₫). */
export function formatMoneyInput(input: string): string {
  const n = parseMoney(input);
  return n ? vnd.format(n) : "";
}

export function initials(name?: string | null, email?: string | null) {
  const base = name || email || "?";
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}
