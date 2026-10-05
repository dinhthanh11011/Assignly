/**
 * Mở hộp thoại "Ghi một khoản" từ BẤT KỲ ĐÂU trong app, kèm ngày đặt sẵn.
 *
 * `QuickAddButton` chỉ mount MỘT lần, trong khung app (xem `TopBar`) — nó nằm
 * cách những chỗ muốn gọi nó (ô lịch, sheet một ngày) cả cây component, mà không
 * chỗ nào trong số đó là con của nó. Đưa state lên trên cùng thì mọi trang phải
 * gánh thêm một provider chỉ để truyền xuống một cái boolean.
 *
 * Sự kiện trên `window` là đường ngắn nhất mà không dựng thêm tầng nào. Nó chỉ
 * chạy phía client và chỉ có đúng một bên nghe.
 *
 * VÌ SAO KHÔNG MỞ THẲNG MỘT DIALOG THỨ HAI ở chỗ gọi: Radix khoá tiêu điểm vào
 * dialog đang mở, nên dialog chồng dialog thì form bên trên không gõ được (xem
 * ghi chú trong `day-detail-dialog.tsx`). Bên gọi phải ĐÓNG mình lại rồi mới
 * phát sự kiện.
 */
export const QUICK_ADD_EVENT = "assignly:quick-add";

export type QuickAddDetail = {
  /** Ngày đặt sẵn cho khoản mới, dạng "2026-08-05". Bỏ trống = hôm nay. */
  date?: string;
  /** Chép lại một khoản đã có — xem `TransactionTemplate`. */
  template?: TransactionTemplate;
};

/**
 * "GHI LẠI KHOẢN NÀY": mọi thứ của một khoản cũ trừ ngày.
 *
 * Phần lớn sổ thu chi là những khoản lặp — cà phê sáng, đổ xăng, tiền chợ, cùng
 * loại, cùng người trả, cùng cách chia, số tiền na ná. Ghi lại từ đầu là bấm lại
 * đủ năm sáu thứ y hệt lần trước; chép từ khoản cũ thì chỉ còn xem lại số tiền
 * rồi bấm Ghi. Ngày cố ý KHÔNG chép: khoản lặp là khoản của hôm nay.
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
