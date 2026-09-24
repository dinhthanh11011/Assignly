import { z } from "zod";
import { dateFromKey, dateKey } from "@/lib/utils";

/**
 * Luật chung cho dữ liệu trình duyệt gửi lên server action.
 *
 * Tách ra đây (không phải `actions.ts`) vì file "use server" chỉ được export hàm
 * async — muốn test được thì schema phải nằm ở một module thường.
 */

/**
 * Trần của mọi số tiền: 1 nghìn tỷ đồng. Không phải một con số nghiệp vụ, chỉ là
 * chốt để một lời gọi thẳng vào action không ghi được `1e308` rồi làm tổng của
 * cả sổ thành `Infinity`. Cột là `Float`, và tổng các số nguyên còn chính xác
 * tới 2^53 ≈ 9 triệu tỷ — trần này cho dư sức cộng.
 */
export const MAX_AMOUNT = 1_000_000_000_000;

/**
 * Số tiền: đồng nguyên, không âm. Form chỉ gửi số nguyên (`parseMoney` giữ lại
 * chữ số), nên số lẻ chỉ có thể đến từ lời gọi thẳng — và `syncLoanStatus` so
 * `paid >= amount` trên số thực chưa làm tròn.
 */
export const amountSchema = z
  .number()
  .int("Số tiền phải là số nguyên")
  .min(0, "Số tiền không được âm")
  .max(MAX_AMOUNT, "Số tiền quá lớn");

/** Như `amountSchema` nhưng phải > 0. */
export const positiveAmountSchema = amountSchema.positive("Số tiền phải lớn hơn 0");

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Khoá ngày "2026-08-05" phải là một ngày CÓ THẬT. Chỉ khớp regex là chưa đủ:
 * `dateFromKey` dùng `Date.UTC`, nó lặng lẽ dời "2026-13-45" thành 2027-02-14 và
 * hiểu năm 0–99 là 19xx ("0026" → 1926). Đi một vòng mà ra lại đúng chuỗi cũ
 * thì mới nhận.
 */
export function dateKeySchema(message = "Ngày không hợp lệ") {
  // Một `refine` duy nhất chứ không phải `.regex().refine()`: zod 4 vẫn chạy
  // refine khi regex đã trượt, và `dateKey` ném RangeError với ngày không đọc được.
  return z.string().refine((s) => {
    if (!DATE_KEY_RE.test(s)) return false;
    const year = Number(s.slice(0, 4));
    return year >= 1900 && year <= 2100 && dateKey(dateFromKey(s)) === s;
  }, message);
}
