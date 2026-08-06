import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Ô nhập sáng hơn trang, viền 1.5px đạt ≥3:1 (WCAG 1.4.11). Bản cũ dùng
 * `bg-sunken` + viền hairline alpha 8% (~1.08:1) — người dùng không nhìn ra ô
 * nhập bắt đầu từ đâu. Ô nhập phải SÁNG hơn nền, đó mới là gợi ý "gõ vào đây".
 *
 * text-body (17px) cũng chặn luôn iOS tự phóng to khi focus vào field <16px.
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
          "flex h-14 w-full min-w-0 rounded-lg border-[1.5px] border-input bg-card px-4 text-body text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
