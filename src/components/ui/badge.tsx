import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Chip trạng thái. Bản cũ là 11px, viết hoa, giãn chữ — nghĩa là
 * MỌI chip trong app đều 11px viết hoa giãn chữ, tổ hợp khó đọc nhất có thể:
 * viết hoa xoá mất hình dáng lên/xuống của từ (tín hiệu nhận từ chính của người
 * đọc yếu), còn dấu tiếng Việt ở 11px viết hoa thì chen vào chiều cao chữ hoa.
 * Nay là 15px chữ thường trên nền đục đo được.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label leading-tight [&_svg]:size-4 [&_svg]:shrink-0",
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
        outline: "border-[1.5px] border-border text-foreground",
        muted: "bg-sunken text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
