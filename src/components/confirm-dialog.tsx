"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Bước xác nhận dùng chung cho mọi hành động xoá.
 *
 * Trước đây xoá một khoản, xoá loại, xoá lần chuyển tiền và rời sổ đều KHÔNG
 * hỏi gì — bấm nhầm một cái là mất dữ liệu thật, không lấy lại được. Với người
 * lớn tuổi và trẻ con thì đó là cái bẫy, không phải sự tiện.
 *
 * Ba điều bắt buộc ở mọi lần dùng:
 *  · `description` phải nói RÕ cái gì mất đi (bao nhiêu, của ai, kèm theo gì).
 *  · nhãn nút xác nhận phải là động từ cụ thể ("Xoá khoản này"), không phải "OK".
 *  · việc KHÔNG PHẢI XOÁ thì phải override cả `pendingLabel`, `cancelLabel` và
 *    `confirmVariant` — cả ba mặc định ("Đang xoá…", "Thôi, giữ lại", nút đỏ)
 *    đều mang hình dạng của một cú xoá. Để nguyên khi hỏi "đánh dấu đã trả
 *    xong?" là nói với người dùng rằng khoản nợ của họ sắp bị xoá.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = "destructive",
  pendingLabel = "Đang xoá…",
  cancelLabel = "Thôi, giữ lại",
  successMessage,
  onConfirm,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Nói rõ mất gì. Đây là phần quan trọng nhất của hộp thoại này. */
  description: React.ReactNode;
  confirmLabel: string;
  /** Để "default" cho việc tích cực (đánh dấu đã trả xong) — đỏ chỉ dành cho mất mát. */
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  pendingLabel?: string;
  cancelLabel?: string;
  successMessage: string;
  onConfirm: () => Promise<unknown>;
  /** Chạy sau khi thành công — ví dụ điều hướng về danh sách. */
  onDone?: () => void;
}) {
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            disabled={pending}
            aria-busy={pending}
            onClick={() =>
              start(async () => {
                try {
                  await onConfirm();
                  toast.success(successMessage);
                  onOpenChange(false);
                  onDone?.();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              })
            }
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Nút + hộp xác nhận gói sẵn, cho những chỗ chỉ cần "một nút xoá có hỏi lại".
 * Chỗ nào nút xoá nằm trong một menu `⋯` thì dùng thẳng <ConfirmDialog/> và tự
 * giữ state, vì menu phải đóng trước rồi dialog mới được mở (xem openAfterMenu).
 */
export function ConfirmButton({
  children,
  className,
  variant = "ghost",
  size = "icon-sm",
  "aria-label": ariaLabel,
  ...confirm
}: React.ComponentProps<typeof ConfirmDialog> extends never
  ? never
  : Omit<React.ComponentProps<typeof ConfirmDialog>, "open" | "onOpenChange"> & {
      children: React.ReactNode;
      className?: string;
      variant?: React.ComponentProps<typeof Button>["variant"];
      size?: React.ComponentProps<typeof Button>["size"];
      "aria-label"?: string;
    }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <ConfirmDialog {...confirm} open={open} onOpenChange={setOpen} />
    </>
  );
}
