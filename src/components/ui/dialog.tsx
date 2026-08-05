"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Trên điện thoại dialog là bottom sheet: dán đáy màn hình, full chiều ngang,
 * cao tối đa 92dvh (dvh để không bị thanh địa chỉ của Safari ăn mất phần dưới)
 * và tự cuộn bên trong. Từ sm trở lên nó trở lại modal căn giữa.
 */
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/55 backdrop-blur-md" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "dialog-panel fixed z-50 flex flex-col gap-4 overflow-y-auto overscroll-contain border border-hairline bg-card shadow-lift",
        // Mobile: bottom sheet
        "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5",
        // sm+: modal căn giữa
        "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(90dvh,44rem)] sm:w-[calc(100%-3rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6",
        className
      )}
      {...props}
    >
      {/* Tay nắm gợi ý đây là sheet có thể cuộn — chỉ hiện trên mobile */}
      <div
        aria-hidden
        className="mx-auto -mt-2 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden"
      />
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-4 flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground focus:outline-none sm:right-4 sm:size-8">
        <X className="size-4" />
        <span className="sr-only">Đóng</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // pr-10: chừa chỗ cho nút đóng ở góc phải, tránh tiêu đề dài chạy dưới dấu X.
  return <div className={cn("flex shrink-0 flex-col gap-1.5 pr-10", className)} {...props} />;
}

/** Vùng nội dung cuộn được — dùng cho form dài để nút hành động luôn nằm dưới cùng. */
export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("-mx-4 min-h-0 flex-1 overflow-y-auto px-4 sm:mx-0 sm:px-0", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:min-w-0",
        className
      )}
      {...props}
    />
  );
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("break-words text-base font-semibold tracking-tight sm:text-lg", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";
