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
};

export function openQuickAdd(detail: QuickAddDetail = {}) {
  window.dispatchEvent(new CustomEvent<QuickAddDetail>(QUICK_ADD_EVENT, { detail }));
}
