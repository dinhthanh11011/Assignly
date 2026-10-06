import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Chip trạng thái: chữ thường cỡ label trên nền đục nhạt của token.
 *
 * `shape="pill"` cho nhãn đứng một mình (vai trò, "đang mở"); mặc định
 * `rounded-md` cho chip nằm trong hàng. Chip KHÔNG bấm được — thứ bấm được là
 * Button. Thông tin không bao giờ chỉ do màu mang: luôn có chữ, nên `icon` chỉ
 * là phần nhấn thêm (aria-hidden).
 */
const badgeVariants = cva(
  "inline-flex max-w-full items-center gap-1.5 text-label leading-tight [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary-surface text-primary",
        accent: "bg-primary-surface text-primary",
        income: "bg-income-surface text-income",
        expense: "bg-expense-surface text-expense",
        success: "bg-income-surface text-income",
        warning: "bg-warning-surface text-warning",
        destructive: "bg-expense-surface text-expense",
        outline: "border border-border bg-card text-foreground",
        muted: "bg-sunken text-muted-foreground",
        solid: "bg-primary text-primary-foreground",
      },
      shape: {
        default: "rounded-md px-2.5 py-1",
        pill: "rounded-full px-3 py-1",
      },
      size: {
        default: "",
        sm: "gap-1 px-2 py-0.5 text-caption [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "default", shape: "default", size: "default" },
  }
);

export function Badge({
  className,
  variant,
  shape,
  size,
  icon: Icon,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    /** Icon lucide đứng trước chữ. */
    icon?: React.ElementType;
  }) {
  return (
    <span className={cn(badgeVariants({ variant, shape, size }), className)} {...props}>
      {Icon && <Icon aria-hidden />}
      {children}
    </span>
  );
}

export { badgeVariants };
