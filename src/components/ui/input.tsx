import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Ô nhập sáng hơn trang, viền 1.5px đạt ≥3:1 (WCAG 1.4.11). Bản cũ dùng
 * `bg-sunken` + viền hairline alpha 8% (~1.08:1) — người dùng không nhìn ra ô
 * nhập bắt đầu từ đâu. Ô nhập phải SÁNG hơn nền, đó mới là gợi ý "gõ vào đây".
 *
 * `text-field` (không phải `text-body`) là bậc riêng có sàn 16px: iOS tự phóng to
 * cả trang khi focus vào field có chữ nhỏ hơn 16px, mà cỡ gốc của app là 15px.
 * Xem --text-field trong globals.css.
 */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          // min-w-0: <input> có bề rộng nội tại ~20 ký tự, và min-width:auto
          // không cho flex item co xuống dưới mức đó — nên mọi hàng "icon +
          // input + nút" đều tràn ngang ở cỡ chữ lớn, dù đã có w-full.
          //
          // Cao 48px, không phải 56px. Ô nhập cao hơn nút là chuyện ngược: nút
          // là thứ được bấm nhiều hơn. 56px cũng chính là chỗ làm mỗi form đọc
          // thành một cột hộp phồng. `min-h-[48px]` là sàn px cứng ở cỡ chữ mặc
          // định (h-12 chỉ ra 45px khi cỡ gốc là 15px) — xem ghi chú cùng chuyện
          // đó ở button.tsx.
          "focus-ring flex h-12 min-h-[48px] w-full min-w-0 rounded-lg border border-input bg-card px-4 text-field text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
