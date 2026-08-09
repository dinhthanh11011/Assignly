"use client";
import { useCallback, useState } from "react";
import { CircleAlert } from "lucide-react";

/**
 * Báo lỗi NGAY TẠI Ô SAI, thay cho toast.
 *
 * Trước đây mọi form validate bằng `toast.error("Nhập số tiền lớn hơn 0")`. Trên
 * điện thoại, form là một tấm trượt lên từ đáy và người dùng đã cuộn xuống cuối
 * để bấm Lưu — nên toast hiện ở ĐỈNH MÀN HÌNH, còn ô sai thì nằm ngoài tầm nhìn,
 * không viền đỏ, không được focus. Người dùng đọc "nhập số tiền" mà không biết
 * phải cuộn đi đâu.
 *
 * Nghịch lý là CSS cho việc này đã nằm sẵn trong ui/input.tsx và ui/textarea.tsx
 * (`aria-[invalid=true]:border-destructive`) từ lâu — chỉ là chưa có gì bật nó
 * lên: cả `src/` không có lấy một `aria-invalid`.
 *
 * Vì sao tự viết chứ không dùng react-hook-form (đã có sẵn trong package.json):
 * không ô nào ở đây là input thường. Ô tiền có 7 nút cộng nhanh tự ghi đè giá
 * trị, ô chia tiền giữ cả một object, ô chọn loại là mảng có thứ tự dựng từ lưới
 * button. Tất cả sẽ phải bọc <Controller> — nhiều code hơn useState hiện tại. Mà
 * phần thật sự cần sửa (aria-invalid, aria-describedby, role="alert", cuộn tới ô
 * sai) thì RHF không làm hộ dòng nào.
 */
export function useValidation<K extends string>() {
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});

  /**
   * Chấm các luật theo thứ tự khai báo, trả `true` nếu sạch.
   * Nếu có lỗi: đưa ô sai ĐẦU TIÊN vào tầm nhìn rồi focus nó.
   */
  const check = useCallback((rules: { field: K; invalid: boolean; message: string }[]) => {
    const next: Partial<Record<K, string>> = {};
    for (const r of rules) if (r.invalid && !next[r.field]) next[r.field] = r.message;
    setErrors(next);

    const first = rules.find((r) => r.invalid);
    if (!first) return true;

    // scrollIntoView tính theo vùng cuộn GẦN NHẤT, ở đây là <DialogBody> bên
    // trong tấm trượt — nên nó cuộn đúng ruột form chứ không cuộn cả trang.
    // preventScroll khi focus: để lần cuộn mượt vừa rồi không bị focus giật lại.
    const el = document.getElementById(first.field);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    (el as HTMLElement | null)?.focus({ preventScroll: true });
    return false;
  }, []);

  /** Gọi từ onChange của ô: lỗi biến mất ngay khi người dùng sửa, không đợi submit lại. */
  const clear = useCallback((field: K) => {
    setErrors((prev) => (prev[field] === undefined ? prev : { ...prev, [field]: undefined }));
  }, []);

  return { errors, check, clear };
}

/**
 * Dòng báo lỗi dưới một ô. Không render gì khi không có lỗi.
 *
 * `id` phải là `${idCủaÔ}-error` và được nối vào aria-describedby của ô đó — nếu
 * không, máy đọc màn hình đọc tên ô rồi im, người dùng không biết mình sai gì.
 *
 * BẮT BUỘC CÓ ICON: quy tắc 8 ở đầu page-shell.tsx cấm để màu là kênh duy nhất
 * mang tin. Chữ đỏ không kèm dấu hiệu nào khác thì với người mù màu đỏ-lục nó
 * chỉ là một dòng chữ nữa.
 */
export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-caption text-destructive">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/**
 * Gộp các id mô tả thành một chuỗi aria-describedby, bỏ qua cái không có.
 * Trả `undefined` (chứ không phải chuỗi rỗng) khi không còn gì — một
 * aria-describedby rỗng vẫn là một thuộc tính, và nó trỏ vào hư không.
 */
export function describedBy(...ids: unknown[]) {
  // Nhận unknown chứ không phải string|false: chỗ gọi hay viết `hint && id`, mà
  // `hint` là ReactNode nên kết quả có thể là 0, "" hay một phần tử — lọc theo
  // kiểu ở đây gọn hơn bắt mọi chỗ gọi tự ép về boolean.
  const list = ids.filter((x): x is string => typeof x === "string" && x.length > 0);
  return list.length ? list.join(" ") : undefined;
}
