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
 * Hình học đó là công thái học thật trên di động — giữ nguyên.
 */
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    {/* Không backdrop-blur: đắt trên iOS, và độ mờ 65% đã làm đủ việc. */}
    <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/65" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "dialog-panel fixed z-50 flex flex-col gap-4 overflow-y-auto overscroll-contain border border-border bg-card shadow-lift",
        // Mobile: bottom sheet. `max-h` trừ thêm vùng an toàn TRÊN — 92dvh tính
        // cả dải nằm dưới đồng hồ/tai thỏ (viewport-fit=cover), nên với form dài
        // thì tay nắm và tiêu đề sheet bị thanh trạng thái đè.
        "inset-x-0 bottom-0 max-h-[calc(92dvh-env(safe-area-inset-top))] rounded-t-2xl px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5",
        // sm+: modal căn giữa
        "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(90dvh,44rem)] sm:w-[calc(100%-3rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6",
        className
      )}
      {...props}
    >
      {/* Tay nắm gợi ý đây là sheet có thể cuộn — chỉ hiện trên mobile */}
      {/* bg-border-strong, không bg-border: từ đợt làm mới --border là viền tóc
          nhạt, mà tay nắm là AFFORDANCE — nó phải tự thấy được, không phải một
          vách ngăn. */}
      <div
        aria-hidden
        className="mx-auto -mt-2 h-1.5 w-12 shrink-0 rounded-full bg-border-strong sm:hidden"
      />
      {children}
      <DialogPrimitive.Close className="focus-ring absolute right-2 top-3 flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground sm:right-3">
        <X className="size-6" />
        <span className="sr-only">Đóng</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // pr-14: chừa chỗ cho nút đóng 48px ở góc phải, tránh tiêu đề dài chạy dưới dấu X.
  return <div className={cn("flex shrink-0 flex-col gap-1.5 pr-14", className)} {...props} />;
}

/**
 * Vùng nội dung cuộn được — dùng cho form dài để nút hành động luôn nằm dưới cùng.
 *
 * PHẢI CÒN ĐỆM NGANG Ở `sm:` — bản trước đặt `sm:mx-0 sm:px-0` và đó là nguồn của
 * thanh cuộn ngang mỏng ~5px ở đáy mọi dialog trên desktop.
 *
 * `overflow-y: auto` KHÔNG chỉ ảnh hưởng trục dọc: theo CSS, một trục đặt khác
 * `visible` thì trục kia tự tính thành `auto`. Nên hộp này cuộn ngang được, và
 * chỉ cần một phần tử con chìa ra vài pixel là có thanh cuộn thật.
 *
 * Thứ chìa ra là lề âm: lưới danh mục (và mấy hàng nút khác) dùng `-mx-1 px-1` để
 * vòng focus không bị mép hộp cuộn cắt mất. Trên mobile `-mx-4 px-4` ở đây hứng
 * trọn 4px đó; ở `sm:` thì không còn gì để hứng. Giữ lại đúng 4px đệm là đủ, và
 * nó cũng chính là chỗ cho vòng focus của MỌI dialog về sau.
 */
export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("-mx-4 min-h-0 flex-1 overflow-y-auto px-4 sm:-mx-1 sm:px-1", className)}
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
