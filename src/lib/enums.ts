/**
 * MỌI TẬP GIÁ TRỊ CỐ ĐỊNH CỦA APP, khai đúng MỘT chỗ.
 *
 * Trong DB những cột này là `text` thuần — repo này KHÔNG dùng kiểu enum của
 * Postgres, xem mục "Không bao giờ dùng enum dưới DB" trong AGENTS.md. Đổi lại,
 * việc canh giữ giá trị hợp lệ chuyển hẳn về tầng server, và đây là nơi làm việc
 * đó: danh sách ở file này là bản DUY NHẤT, zod parse theo nó, TypeScript hẹp
 * kiểu theo nó, và `src/lib/db.ts` gắn nó lại vào từng cột khi đọc ra.
 *
 * Thêm một giá trị mới thì thêm vào đây TRƯỚC — mọi chỗ kiểm còn lại sẽ tự bắt
 * lỗi biên dịch nếu quên xử lý.
 */

export const TX_TYPES = ["INCOME", "EXPENSE"] as const;
/** Chiều tiền của một khoản: "INCOME" = thu, "EXPENSE" = chi. */
export type TxType = (typeof TX_TYPES)[number];

export const GROUP_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
/** Quyền bên trong MỘT sổ. Đừng nhầm với `User.isAdmin` (quản trị toàn hệ thống). */
export type GroupRole = (typeof GROUP_ROLES)[number];

export const JOIN_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUSES)[number];

export const LOAN_TYPES = ["LEND", "BORROW"] as const;
/** "LEND" = mình cho vay (cần thu nợ), "BORROW" = mình đi vay. */
export type LoanType = (typeof LOAN_TYPES)[number];

export const LOAN_STATUSES = ["ACTIVE", "PAID", "CANCELLED"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const SPLIT_MODES = ["EQUAL", "WEIGHT", "EXACT"] as const;
/** Kiểu chia đã chọn ở form — xem `Transaction.splitMode`. */
export type SplitMode = (typeof SPLIT_MODES)[number];

/**
 * Kiểm một chuỗi bất kỳ có nằm trong tập hay không, và HẸP KIỂU luôn.
 *
 * Dùng ở mọi đường dữ liệu đi VÀO từ ngoài mà không qua zod (tham số URL, dữ
 * liệu cũ trong IndexedDB…). Đường ghi xuống DB thì đã có zod `z.enum` chặn.
 */
export function isEnumValue<T extends readonly string[]>(
  values: T,
  raw: unknown
): raw is T[number] {
  return typeof raw === "string" && (values as readonly string[]).includes(raw);
}
