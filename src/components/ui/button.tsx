import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Nút dạng viên thuốc (pill) — hình dạng chủ đạo của hệ neo-finance.
 * `gradient` là CTA duy nhất được phép chói: lime → mint, chữ ink, có hào quang.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-[background-color,box-shadow,transform,color,filter] duration-150 ease-spring outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:brightness-110",
        gradient:
          "accent-gradient text-accent-foreground shadow-glow hover:brightness-105 active:brightness-100",
        secondary: "bg-sunken text-foreground hover:bg-muted",
        outline: "glass text-foreground hover:bg-sunken",
        ghost: "hover:bg-sunken",
        soft: "bg-primary/12 text-primary hover:bg-primary/20",
        accent: "bg-accent/20 text-accent-foreground hover:bg-accent/30 dark:text-accent",
        income: "bg-income/14 text-income hover:bg-income/24",
        destructive: "bg-destructive text-destructive-foreground shadow-soft hover:brightness-110",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-13 px-7 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-9",
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
