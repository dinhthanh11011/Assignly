"use client";
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "focus-ring flex h-12 min-h-[48px] w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-4 text-field font-medium transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      {/* Không giảm opacity: mũi tên này CHÍNH LÀ dấu hiệu "bấm được". */}
      <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        "relative z-50 max-h-[min(60dvh,26rem)] min-w-40 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lift",
        position === "popper" && "translate-y-1",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "max-h-[min(60dvh,26rem)] overflow-y-auto p-1.5",
          // KHÔNG khoá cứng bằng chiều rộng nút bấm: nút hẹp (bộ chọn sổ trên
          // điện thoại) thì danh sách cũng hẹp theo, chữ bị cắt sạch và chỉ còn
          // trơ dấu tích. Rộng bằng nút là mức TỐI THIỂU, còn lại theo nội dung.
          position === "popper" && "min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex min-h-12 w-full cursor-pointer select-none items-center rounded-md py-3 pl-10 pr-3 text-body outline-none [&>span]:truncate focus:bg-primary-surface focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-3 flex size-5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-5" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
