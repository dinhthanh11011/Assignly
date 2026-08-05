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
