"use client";
import { useState, useTransition } from "react";
import { CircleHelp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AmountField } from "@/components/money-input";
import { FieldError, useValidation } from "@/components/field";
import { fillTransactionAmount } from "@/lib/actions";
import { memberLabel, type MemberOption } from "@/lib/member";
import type { TransactionItem } from "@/components/transaction-list";
import { categoryLabel, formatDate, formatWeekday } from "@/lib/utils";

/**
 * ĐIỀN SỐ TIỀN cho một khoản đã ghi trước lúc chưa biết bao nhiêu.
 *
 * Vì sao là một hộp thoại riêng chứ không phải dùng lại form Sửa: đây là màn hình
 * của MỘT câu hỏi — "bữa đó hết bao nhiêu?" — và người dùng đang đứng trước nó với
 * đúng một mẩu tin mới trong tay (tin nhắn của người trả hộ, tờ hoá đơn). Form Sửa
 * mở ra là mười thứ để đọc lại và mười chỗ để bấm nhầm, trong khi chín thứ trong
 * đó họ đã điền đúng từ hôm ghi rồi.
 *
 * Phần trên sheet nhắc lại ĐANG ĐIỀN CHO KHOẢN NÀO (loại, ngày, ai bỏ tiền). Nó
 * không phải để trang trí: một sổ có thể đang chờ năm khoản cùng dạng "ăn trưa,
 * Nam trả", và điền 320.000 vào đúng cái nhầm là một lỗi im lặng không ai phát
 * hiện ra được về sau.
 *
 * Cách chia thì KHÔNG hỏi lại: khoản chưa rõ luôn lưu bằng trọng số, nên phần mỗi
 * người tự chia ra từ con số vừa điền — xem `fillTransactionAmount`.
 */
export function FillAmountDialog({
  transaction: t,
  members,
  currentUserId,
  open,
  onOpenChange,
  onFilled,
}: {
  transaction: TransactionItem;
  members: MemberOption[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Điền xong — để danh sách gọi nó bỏ khoản này ra khỏi khối nhắc việc. */
  onFilled?: () => void;
}) {
  const [amount, setAmount] = useState(0);
  const [pending, start] = useTransition();
  const { errors, check, clear } = useValidation<"fill-amount">();

  const payer = t.paidBy ?? t.createdBy;
  const date = new Date(t.date);
  const shared = members.length > 1;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!check([{ field: "fill-amount", invalid: amount <= 0, message: "Nhập số tiền lớn hơn 0" }]))
      return;
    start(async () => {
      try {
        await fillTransactionAmount(t.id, amount);
        toast.success("Đã điền số tiền");
        onFilled?.();
        onOpenChange(false);
      } catch (err) {
        // Không xếp hàng chờ ngoại tuyến ở đây, cùng lý do với mọi lần SỬA khác:
        // đây là một thay đổi trên bản đang có ở server, mà lúc mất mạng thì không
        // biết bản đó giờ là gì — người khác trong sổ có thể đã điền xong rồi.
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* noValidate: bong bóng validation của trình duyệt chạy TRƯỚC onSubmit và
          hiện tiếng Anh của hệ điều hành, chặn mất luật inline bên dưới. */}
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>Điền số tiền</DialogTitle>
          <DialogDescription>
            Khoản này bạn đã ghi trước lúc chưa biết bao nhiêu. Điền vào là nó vào tổng
            thu chi của sổ như mọi khoản khác.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
          <DialogBody className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-sunken px-3.5 py-3">
              <CircleHelp aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-body-lg">
                  {t.categories[0]?.category.icon ?? (t.type === "INCOME" ? "💵" : "📦")}{" "}
                  {categoryLabel(t)}
                </p>
                <p className="text-caption text-muted-foreground">
                  {formatWeekday(date)}, {formatDate(date)}
                  {shared &&
                    ` · ${memberLabel({ ...payer, image: null })}${
                      payer.id === currentUserId ? " (bạn)" : ""
                    } ${t.type === "INCOME" ? "cầm tiền" : "bỏ tiền"}`}
                </p>
                {t.note && (
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-caption text-muted-foreground">
                    {t.note}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {/* KHÔNG truyền onAmountUnknownChange: cả sheet này tồn tại để thoát
                  khỏi trạng thái "chưa biết", nên một nút quay lại đúng trạng thái
                  đó ở đây chỉ là một đường vòng không dẫn tới đâu. Muốn để lại chưa
                  biết thì đóng sheet — cùng một việc, ít giải thích hơn. */}
              <AmountField
                id="fill-amount"
                value={amount}
                onValueChange={(v) => {
                  setAmount(v);
                  clear("fill-amount");
                }}
                type={t.type}
                autoFocus
                invalid={Boolean(errors["fill-amount"])}
                describedBy={errors["fill-amount"] && "fill-amount-error"}
              />
              <FieldError id="fill-amount-error">{errors["fill-amount"]}</FieldError>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Đang lưu…" : "Lưu số tiền này"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
