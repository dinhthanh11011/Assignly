"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Dialog = bottom sheet trên điện thoại, modal căn giữa từ `sm`.
 *
 * - Sheet dán đáy, bo 2xl hai góc trên, có tay nắm, cao tối đa 92dvh trừ vùng an
 *   toàn trên (viewport-fit=cover — thiếu phần trừ đó thì tiêu đề bị thanh trạng
 *   thái đè).
 * - Chuyển động: vào 200ms, ra 130ms, chỉ transform + opacity. Keyframes ở
 *   globals.css; thời lượng ghi đè ở đây. reduced-motion được globals tắt hẳn.
 * - Bàn phím ảo ĐÈ lên sheet, sheet không nhúc nhích (`interactive-widget:
 *   resizes-visual`, xem app/layout.tsx). Đã thử nhấc sheet theo visualViewport:
 *   khung nhảy mỗi lần bàn phím mở/đóng và hở nền ở đáy. Đừng làm lại.
 */
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    {/* Không backdrop-blur: đắt trên iOS. */}
    <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/60 data-[state=closed]:animate-[dialog-fade-out_130ms_ease-in] data-[state=open]:animate-[dialog-fade-in_200ms_ease-out]" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "dialog-panel fixed z-50 flex flex-col gap-4 overflow-y-auto overscroll-contain border border-border bg-card shadow-lift",
        "data-[state=open]:animate-[sheet-in_200ms_var(--spring)] data-[state=closed]:animate-[sheet-out_130ms_ease-in]",
        "sm:data-[state=open]:animate-[modal-in_200ms_var(--spring)] sm:data-[state=closed]:animate-[modal-out_130ms_ease-in]",
        // Mobile: bottom sheet.
        "inset-x-0 bottom-0 max-h-[calc(92dvh-env(safe-area-inset-top))] rounded-t-2xl border-b-0 px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3",
        // sm+: modal căn giữa
        "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(90dvh,46rem)] sm:w-[calc(100%-3rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border-b sm:p-6",
        className
      )}
      {...props}
    >
      {/* Tay nắm — affordance của sheet, nên dùng border-strong cho thấy rõ. */}
      <div aria-hidden className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />
      {children}
      <DialogPrimitive.Close className="focus-ring absolute right-2 top-4 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-sunken hover:text-foreground sm:right-3 sm:top-3">
        <X className="size-6" aria-hidden />
        <span className="sr-only">Đóng</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // pr-14: chừa chỗ cho nút đóng ở góc phải.
  return <div className={cn("flex shrink-0 flex-col gap-1 pr-14", className)} {...props} />;
}

/**
 * Vùng nội dung cuộn được — form dài dùng nó để chân sheet (nút chính) luôn thấy.
 *
 * Giữ 4px đệm ngang ở `sm:`: `overflow-y: auto` kéo trục ngang thành `auto`
 * theo, và lề âm `-mx-1` của lưới bên trong (chỗ cho vòng focus) sẽ sinh thanh
 * cuộn ngang nếu ở đây không có đệm hứng lại.
 */
export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("-mx-4 min-h-0 flex-1 overflow-y-auto px-4 sm:-mx-1 sm:px-1", className)}
      {...props}
    />
  );
}

/**
 * Chân sheet: nút hành động chính. Dính đáy (`sticky`) để cả khi panel tự cuộn
 * (dialog không dùng DialogBody) nút vẫn trong tầm tay; trên điện thoại có vạch
 * ngăn với phần cuộn phía trên.
 */
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card px-4 pt-3 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:px-0 sm:pt-0 [&>*]:min-w-0",
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
  <DialogPrimitive.Title ref={ref} className={cn("break-words text-title", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-body text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";
