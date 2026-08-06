import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Nút bo 12px (--radius-lg).
 *
 * KHÔNG còn `rounded-full`. Hình viên thuốc nay chỉ dành cho chip/badge, thứ
 * KHÔNG bấm được — xem thang bo góc ở globals.css. Khi nút, tab, chip và ô chọn
 * đều tròn hết cỡ thì hình dáng thôi phân biệt được vật bấm được với cái nhãn,
 * và mọi thứ đọc thành một rổ viên thuốc giống nhau.
 *
 * Nút đặc cũng bỏ `shadow-soft`. Một mảng indigo đặc trên nền gần trắng đã là
 * thứ tương phản mạnh nhất màn hình; thêm bóng chỉ làm nó dày lên chứ không nổi
 * hơn. Bóng ở app này nay chỉ dành cho thứ NỔI THẬT trên mặt phẳng trang.
 *
 * Cỡ nhỏ nhất là 44px — ngưỡng WCAG 2.5.5 và Apple HIG. Bản cũ có `sm` cao 32px
 * với chữ 12px; trên điện thoại đó là mục tiêu bấm trượt.
 *
 * App chỉ có ĐÚNG MỘT diện mạo cho hành động chính. `gradient` cũ (lime + hào
 * quang) đã bị gộp làm bí danh của `default`: hai màu cùng tranh "chói nhất"
 * (primary tím và CTA lime) là lý do lớn khiến nút chính không đọc ra là *cái*
 * hành động. Giữ tên biến thể để hàng chục call site không vỡ.
 *
 * `active:brightness-95` đi kèm `active:scale` là cố ý: transform bị
 * prefers-reduced-motion tắt, còn đổi màu thì không — nên vẫn còn phản hồi khi
 * bấm. Quan trọng vì app render ở server, mỗi cú bấm đều có quãng chờ.
 */
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[background-color,box-shadow,transform,color,filter] duration-150 ease-spring outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-[0.98] active:brightness-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-110",
        gradient: "bg-primary text-primary-foreground hover:brightness-110",
        secondary: "border border-border bg-sunken text-foreground hover:bg-muted",
        outline: "border border-input bg-card text-foreground hover:bg-sunken",
        ghost: "text-foreground hover:bg-sunken",
        soft: "bg-primary-surface text-primary hover:brightness-95",
        accent: "bg-primary-surface text-primary hover:brightness-95",
        income: "bg-income-surface text-income hover:brightness-95",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        // Link luôn gạch chân: màu sắc một mình không bao giờ được đánh dấu link.
        link: "text-primary underline underline-offset-4",
      },
      size: {
        default: "h-12 px-5 text-body",
        sm: "h-11 px-4 text-body",
        lg: "h-14 px-7 text-body-lg [&_svg]:size-6",
        icon: "size-12 [&_svg]:size-6",
        "icon-sm": "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
