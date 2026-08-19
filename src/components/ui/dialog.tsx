"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Cuộn ô vừa được focus vào chỗ nhìn thấy được.
 *
 * Trình duyệt tự làm việc này cho TRANG, nhưng ở đây ô nhập nằm trong một hộp
 * cuộn lồng trong một tấm `fixed` — và tấm đó vừa mới đổi chiều cao vì bàn phím.
 * Phải đợi bàn phím mở xong: `max-height` của sheet chỉ co lại SAU khi
 * visualViewport bắn resize, nên cuộn ngay lúc focus là cuộn theo hình học cũ và
 * ô nhập cuối form (ghi chú) vẫn nằm ngoài vùng thấy được.
 */
function revealFocusedField(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el?.matches?.('input,textarea,select,[contenteditable="true"]')) return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.setTimeout(
    () => el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" }),
    320
  );
}

/**
 * Trên điện thoại dialog là bottom sheet: dán đáy vùng NHÌN THẤY ĐƯỢC, full
 * chiều ngang, tự cuộn bên trong. Từ sm trở lên nó trở lại modal căn giữa.
 * Hình học đó là công thái học thật trên di động — giữ nguyên.
 *
 * BÀN PHÍM ẢO. Chiều cao và mép dưới đi qua --vvh/--kb (xem ViewportInsets),
 * KHÔNG qua dvh. `dvh` tính theo layout viewport, mà bàn phím ảo không làm
 * layout viewport co lại trên iOS — nên bản cũ mở form ghi khoản là bàn phím
 * (bật tự động vì ô tiền có autoFocus) phủ luôn đáy sheet: nút Lưu và ô ghi chú
 * nằm dưới bàn phím và cuộn cách nào cũng không thấy, vì cái bị che là khung
 * sheet chứ không phải nội dung bên trong nó.
 *
 * Có --kb rồi thì `bottom` bám đúng mép trên bàn phím và `max-height` bám đúng
 * phần còn nhìn thấy — một công thức cho cả iOS lẫn Android, không nhờ trình
 * duyệt tự co trang (thứ đã gây ra khe hở ở đáy trên Chrome Android).
 * Fallback trong var() là hình học cũ, dùng khi JS chưa chạy.
 */
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, onFocus, ...props }, ref) => (
  <DialogPrimitive.Portal>
    {/* Không backdrop-blur: đắt trên iOS, và độ mờ 65% đã làm đủ việc. */}
    <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/65" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "dialog-panel fixed z-50 flex flex-col gap-4 overflow-y-auto overscroll-contain border border-border bg-card shadow-lift",
        // Mobile: bottom sheet. `max-h` trừ thêm vùng an toàn TRÊN cộng 1.5rem —
        // vùng nhìn thấy tính cả dải nằm dưới đồng hồ/tai thỏ (viewport-fit=cover),
        // nên với form dài thì tay nắm và tiêu đề sheet bị thanh trạng thái đè;
        // 1.5rem còn lại để lộ nền mờ, cho thấy đây là một tấm đè lên trang.
        "inset-x-0 bottom-[var(--kb,0px)] max-h-[calc(var(--vvh,100dvh)-env(safe-area-inset-top)-1.5rem)] rounded-t-2xl px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5",
        // Bàn phím đang mở thì KHÔNG chừa vùng an toàn dưới: thanh gạt home nằm
        // sau bàn phím, đệm thêm chỉ là một dải trống giữa nút Lưu và bàn phím.
        "kb-open:pb-4",
        // sm+: modal căn giữa VÙNG NHÌN THẤY (trên tablet bàn phím cũng che, và
        // --vvt là phần vùng đó bị đẩy xuống khi trình duyệt tự cuộn tới ô nhập).
        "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[calc(var(--vvt,0px)+var(--vvh,100dvh)/2)] sm:max-h-[min(calc(var(--vvh,100dvh)*0.9),44rem)] sm:w-[calc(100%-3rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6",
        className
      )}
      /* React nối focusin lên đây, nên một handler ở khung sheet lo cho MỌI ô
         nhập bên trong — không phải rắc vào từng form. */
      onFocus={(event) => {
        onFocus?.(event);
        revealFocusedField(event.target);
      }}
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
