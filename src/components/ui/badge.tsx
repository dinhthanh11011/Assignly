import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase leading-5 tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-primary/14 text-primary",
        accent: "bg-accent/25 text-accent-foreground dark:text-accent",
        income: "bg-income/16 text-income",
        expense: "bg-expense/16 text-expense",
        success: "bg-income/14 text-income",
        warning: "bg-warning/18 text-[color-mix(in_oklch,var(--warning),black_18%)] dark:text-warning",
        destructive: "bg-destructive/14 text-destructive",
        outline: "border border-border text-muted-foreground",
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
