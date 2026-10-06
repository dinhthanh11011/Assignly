import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Nút — xem design-system/so-thu-chi/MASTER.md ("Interaction").
 *
 * · Mọi cỡ ≥44px (sàn px cứng + rem để vẫn to theo cần gạt cỡ chữ).
 * · Hover đổi màu 150ms, bấm thì co nhẹ; reduced-motion vẫn còn đổi màu.
 * · `loading` khoá nút và hiện spinner — app render ở server nên mỗi cú bấm có
 *   quãng chờ, không phản hồi là người dùng bấm lại.
 * · Nhãn được xuống dòng (min-h, không h cứng): nhãn ở app này là câu.
 * · Mỗi màn hình chỉ MỘT nút `default` (hành động chính).
 */
const buttonVariants = cva(
  "focus-ring relative inline-flex cursor-pointer items-center justify-center gap-2 text-center text-balance rounded-lg py-2 font-semibold transition-[background-color,box-shadow,transform,color,filter] duration-150 ease-spring disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-[0.98] active:brightness-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-110 dark:hover:brightness-105",
        secondary: "border border-border bg-sunken text-foreground hover:bg-muted",
        outline: "border border-input bg-card text-foreground hover:bg-sunken",
        ghost: "text-foreground hover:bg-sunken",
        soft: "bg-primary-surface text-primary hover:brightness-95",
        income: "bg-income-surface text-income hover:brightness-95",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        // Link luôn gạch chân: màu sắc một mình không bao giờ được đánh dấu link.
        link: "text-primary underline underline-offset-4",
      },
      size: {
        // Một class min-h duy nhất: hai class cùng đặt min-height thì thắng
        // thua do THỨ TỰ TRONG CSS quyết định, không phải thứ tự viết ở đây.
        // max() gộp cả hai ý — 2.75rem co giãn theo cỡ chữ, 44px là sàn cứng.
        default: "min-h-[max(2.75rem,44px)] px-4.5 text-body",
        sm: "min-h-[max(2.75rem,44px)] px-4 text-body",
        lg: "min-h-[max(3.25rem,48px)] px-6 text-body-lg [&_svg]:size-6",
        icon: "size-11 min-h-[44px] min-w-[44px] [&_svg]:size-6",
        "icon-sm": "size-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Đang chạy việc bất đồng bộ: khoá nút, hiện spinner, giữ nguyên bề rộng. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
