import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge PHẢI được dạy các bậc chữ riêng của app, nếu không nó xoá mất
 * chúng.
 *
 * Mặc định, tailwind-merge coi mọi `text-<gì đó>` lạ là MÀU CHỮ. Nên
 * `cn("text-body-lg", "text-muted-foreground")` bị nó rút gọn thành đúng
 * `text-muted-foreground` — hai class "cùng nhóm màu", giữ cái sau. Cỡ chữ biến
 * mất không một tiếng động, chữ rơi về cỡ mặc định, và không có gì trong code
 * cho thấy điều đó: class vẫn nằm nguyên trong file.
 *
 * Khai báo nhóm `font-size` ở đây là chỗ duy nhất sửa được — sau khi khai báo,
 * tailwind-merge xếp chúng vào nhóm cỡ chữ và thôi coi chúng là màu.
 *
 * THÊM BẬC CHỮ MỚI VÀO `--text-*` TRONG globals.css THÌ PHẢI THÊM VÀO ĐÂY.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "caption",
            "body",
            "body-lg",
            "label",
            // Thiếu "field" ở đây từng là NGUYÊN NHÂN THẬT của lỗi iOS phóng to
            // trang khi bấm vào ô nhập. Input/Textarea đặt `text-field
            // text-foreground`; không có dòng này thì tailwind-merge coi cả hai
            // là màu chữ, giữ cái sau, và `text-field` (sàn 16px) biến mất — cỡ
            // chữ rơi về 15px, đúng dưới ngưỡng zoom của Safari. Ô ngày và ô số
            // tiền không dính vì một bên là control riêng của iOS, một bên đã
            // 26px+. Sàn 16px trong CSS chỉ có tác dụng nếu class còn sống tới
            // lúc render.
            "field",
            "title",
            "page",
            "money-row",
            "money-lg",
            "money-hero",
            "cal",
            "cal-day",
          ],
        },
      ],
    },
  },
});

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
//
// UTC CHỈ LÀ CÁCH LƯU, KHÔNG PHẢI MÚI GIỜ CỦA NGƯỜI DÙNG. "Hôm nay là ngày nào"
// thì phải hỏi theo giờ Việt Nam. Bản trước lấy `new Date().getUTCDate()`, nên
// từ 00:00 tới 07:00 giờ VN app còn coi là NGÀY HÔM QUA: mở app lúc nửa đêm ghi
// một khoản, nó rơi vào hôm trước; lịch tô sai ô "hôm nay"; báo cáo "tháng này"
// đầu tháng thì ra tháng trước. Trên server còn chắc chắn sai hơn — Vercel chạy
// giờ UTC, không có "giờ máy" nào để dựa vào.
//
// Nên múi giờ được CHỐT ở đây thay vì đọc giờ máy: client và server phải cho ra
// cùng một "hôm nay", nếu không thì HTML render ở server lệch với client và React
// báo hydration mismatch — mà đây cũng là app dùng ở Việt Nam.

/** Múi giờ chuẩn của app — mọi câu hỏi "hôm nay/tháng này" đều tính theo giờ này. */
export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

// en-CA cho ra đúng "YYYY-MM-DD", khớp luôn định dạng khoá ngày của app.
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Cắt phần giờ của một Date ĐÃ là date-only (ngày lấy từ DB).
 *
 * KHÔNG dùng cho `new Date()` — nó đọc phần ngày theo UTC, mà giờ hiện tại thì
 * phải đọc theo giờ Việt Nam. Cần "hôm nay" thì gọi `today()` / `todayKey()`.
 */
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

/** Hôm nay THEO GIỜ VIỆT NAM, dạng khoá "2026-08-05". */
export function todayKey(): string {
  return dayKeyFormat.format(new Date());
}

/** Hôm nay theo giờ Việt Nam, đưa về mốc nửa đêm UTC như mọi ngày khác trong app. */
export function today(): Date {
  return dateFromKey(todayKey());
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

/** Tháng hiện tại theo giờ Việt Nam, dạng "2026-08". */
export function currentMonth(): string {
  return todayKey().slice(0, 7);
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

/**
 * Nhãn cột thứ trong lịch, BẮT ĐẦU TỪ CHỦ NHẬT.
 *
 * Bản trước bắt đầu từ Thứ Hai theo lịch giấy. Đổi sang Chủ Nhật để khớp với
 * các app sổ thu chi mà người dùng đang quen (Money Lover, Sổ Thu Chi…) — họ
 * đối chiếu hai app cạnh nhau, và một lưới lệch một cột thì mọi ngày đều đọc
 * sai vị trí.
 *
 * `WEEKEND_COLUMNS` đánh dấu hai cột được tô màu (CN đỏ, T7 xanh dương): chỉ là
 * trang trí quen mắt, không mang thông tin nào — vị trí cột đã nói đủ đó là
 * cuối tuần.
 */
export const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;
export const WEEKEND_COLUMNS = { 0: "sun", 6: "sat" } as const;

/**
 * Các tuần của một tháng, mỗi tuần đúng 7 ô, tuần bắt đầu từ Chủ Nhật. Ô rơi ra
 * ngoài tháng là `null` — lịch cố tình KHÔNG hiện ngày của tháng bên cạnh: một
 * ô mờ vẫn bấm được là cái bẫy quen thuộc của lịch, và ở đây bấm nhầm nghĩa là
 * xem sai tháng mà không hiểu vì sao.
 */
export function monthWeeks(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = Chủ Nhật
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

/**
 * Khoảng cách từ hôm nay tới một ngày, tính bằng ngày (âm = đã qua).
 * "hôm qua" → -1, "ngày mai" → 1.
 */
export function daysFromToday(key: string): number {
  return Math.round((dateFromKey(key).getTime() - today().getTime()) / 86_400_000);
}

/**
 * Câu xác nhận cho một ô chọn ngày: "Hôm nay", "Hôm qua", "3 ngày trước"…
 *
 * VÌ SAO CẦN: `<input type="date">` chỉ đọc ra "24/08/2026". Người dùng ghi một
 * khoản cho ngày khác hôm nay phải TỰ nhẩm xem con số đó có đúng cái ngày mình
 * đang nghĩ không — và đó chính là chỗ chọn nhầm: lăn trúng ô năm trên iOS, hoặc
 * gõ nhầm một chữ số ở tháng, ô vẫn nhận và vẫn trông hợp lệ.
 *
 * `caution` bật ở hai trường hợp gần như chắc chắn là nhầm khi ĐANG GHI một việc
 * đã xảy ra: ngày còn ở tương lai, và ngày lùi quá xa (thường là chọn sai năm).
 * Ngưỡng 45 ngày chứ không phải "khác tháng": ghi bù khoản của tháng trước là
 * chuyện thật và không đáng bị cảnh báo.
 */
export function dayFieldSummary(key: string): { text: string; caution: boolean } {
  const diff = daysFromToday(key);
  if (diff === 0) return { text: "Hôm nay", caution: false };
  if (diff === -1) return { text: "Hôm qua", caution: false };
  if (diff === -2) return { text: "Hôm kia", caution: false };
  if (diff < 0) return { text: `${-diff} ngày trước`, caution: diff < -45 };
  if (diff === 1) return { text: "Ngày mai — ngày này chưa tới", caution: true };
  return { text: `Còn ${diff} ngày nữa mới tới ngày này`, caution: true };
}

/** Số ngày còn lại tới `due` (âm = đã quá hạn). */
export function daysUntil(due: Date): number {
  return Math.round((toDateOnly(due).getTime() - today().getTime()) / 86_400_000);
}

/** Số ngày đã trôi qua kể từ `d` (0 = hôm nay). Ngày ở tương lai cũng trả 0. */
export function daysSince(d: Date): number {
  return Math.max(0, -daysUntil(d));
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

/**
 * Bậc rút gọn RIÊNG cho ô lịch tháng: "12tr", "1,2tr", "600k", "45k".
 *
 * ĐỌC KỸ TRƯỚC KHI SỬA — hàm này đã từng bị xoá một lần.
 *
 * Bản đầu của lịch in số vào ô và thất bại: ô rộng 1/7 màn hình (~44px), người
 * dùng tự tăng cỡ chữ lên 1,33× được, nên "−2,4tr" bị cắt thành "−2…" — một con
 * số cắt dở còn tệ hơn không có số. Lịch khi đó chuyển sang hai vạch cao thấp,
 * và chỗ này ghi "không thêm bậc rút gọn nào nữa".
 *
 * Số quay lại được là nhờ HAI thay đổi, thiếu một trong hai thì hỏng như cũ:
 *  1. Ô lịch dùng cỡ chữ cố định theo px (`text-cal`), KHÔNG nhân theo
 *     --font-scale. Đây là ngoại lệ có chủ ý và có giá của nó: người chọn "Chữ
 *     rất to" không phóng to được số trong ô — bù lại họ bấm một ngày là số đầy
 *     đủ hiện ở cỡ chữ thường ngay dưới lịch.
 *  2. Hàm này chốt trần 5 KÝ TỰ. Không có "12,5tr" (6 ký tự) — từ 10 triệu trở
 *     lên là làm tròn về số nguyên triệu. Trần đó là thứ giữ cho số không bao
 *     giờ bị cắt; nới nó ra là quay lại đúng lỗi cũ.
 *
 * Chỉ dùng trong ô lịch. Chỗ nào rộng hơn thì `formatMoneyShort`, và chỗ nào
 * cần con số thật thì `formatMoney`.
 */
export function formatMoneyCell(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  // Các mốc là 9,95tr / 995k chứ không phải 10tr / 1tr: chúng chặn đúng khoảng
  // mà phép làm tròn của bậc dưới đẻ ra ký tự thứ sáu ("10,0tr", "1000k").
  if (abs >= 999_500_000) return `${(abs / 1_000_000_000).toFixed(1).replace(".", ",")}tỷ`;
  if (abs >= 9_950_000) return `${Math.round(abs / 1_000_000)}tr`;
  if (abs >= 999_500) return `${(abs / 1_000_000).toFixed(1).replace(".", ",")}tr`;
  if (abs >= 1_000) return `${Math.round(abs / 1_000)}k`;
  return String(abs);
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
