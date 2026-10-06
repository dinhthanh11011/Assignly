/**
 * Mở hộp thoại "Ghi khoản" từ BẤT KỲ ĐÂU trong app.
 *
 * `QuickAddButton` mount MỘT lần trong khung app (xem `TopBar`), cách xa những
 * chỗ muốn gọi nó (ô lịch, sheet một ngày, ô trống, toast "Ghi tiếp"). Một sự
 * kiện trên `window` là đường ngắn nhất, chỉ chạy phía client, một bên nghe.
 *
 * Bên gọi đang là một dialog thì phải ĐÓNG mình trước rồi mới phát sự kiện:
 * Radix khoá tiêu điểm vào dialog đang mở, hai dialog chồng nhau thì form bên
 * trên không gõ được.
 */
export const QUICK_ADD_EVENT = "assignly:quick-add";

export type QuickAddDetail = {
  /** Ngày đặt sẵn cho khoản mới, dạng "2026-08-05". Bỏ trống = hôm nay. */
  date?: string;
  /** Chiều tiền mở sẵn. Bỏ trống = khoản chi. */
  type?: "INCOME" | "EXPENSE";
  /** Chép lại một khoản đã có — xem `TransactionTemplate`. */
  template?: TransactionTemplate;
};

/**
 * "GHI LẠI KHOẢN NÀY": mọi thứ của một khoản cũ trừ ngày — khoản lặp (cà phê,
 * xăng, chợ) là khoản của hôm nay, chỉ cần xem lại số tiền rồi bấm Lưu.
 */
export type TransactionTemplate = {
  /** Tên loại chính của khoản gốc — để hộp thoại nói ra đang chép từ đâu. */
  label: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  categoryIds: string[];
  note: string | null;
  paidById: string | null;
  splits: { userId: string; weight: number; amount: number | null }[];
  splitMode: "EQUAL" | "WEIGHT" | "EXACT" | null;
};

export function openQuickAdd(detail: QuickAddDetail = {}) {
  window.dispatchEvent(new CustomEvent<QuickAddDetail>(QUICK_ADD_EVENT, { detail }));
}
