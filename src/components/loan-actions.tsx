"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MoreVertical, Pencil, RotateCcw, Trash2, XCircle } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditLoanDialog, type EditableLoan } from "@/components/loan-dialog";
import {
  EditLoanPaymentDialog,
  type EditablePayment,
} from "@/components/loan-payment-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cancelLoanConfirm, markPaidConfirm } from "@/lib/copy";
import { deleteLoan, deleteLoanPayment, setLoanStatus } from "@/lib/actions";
import { formatDate, formatMoney } from "@/lib/utils";

/**
 * Mở dialog ở nhịp sau khi menu đã đóng hẳn. Bấm bằng ngón tay, nếu dialog mở
 * ngay trong cùng nhịp thì cú `pointerup` còn lại rơi xuống overlay và đóng luôn
 * dialog vừa mở — trên iOS gần như lần nào cũng vậy.
 */
function openAfterMenu(open: (value: boolean) => void) {
  setTimeout(() => open(true), 0);
}

export function LoanActions({
  groupId,
  loan,
  status,
  paymentCount = 0,
  remaining,
  size = "default",
}: {
  groupId: string;
  loan: EditableLoan;
  status: "ACTIVE" | "PAID" | "CANCELLED";
  /** Số lần thu/trả sẽ mất theo khi xoá khoản mượn — hiện trong bước xác nhận. */
  paymentCount?: number;
  /** Số còn lại chưa ghi nhận — bước xác nhận đổi trạng thái phải nói ra nó. */
  remaining: number;
  /** "sm" cho nút gọn đặt trong thẻ danh sách. */
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingPaid, setConfirmingPaid] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<unknown>, message: string, back = false) {
    start(async () => {
      try {
        await fn();
        toast.success(message);
        // `?xem=muon` tường minh: sổ chung mặc định mở tab "Tiền chung", mà rời
        // một khoản mượn thì phải quay về đúng danh sách khoản mượn.
        if (back) router.push("/loans?xem=muon");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={size === "sm" ? "ghost" : "outline"}
            size={size === "sm" ? "icon-sm" : "icon"}
            className={size === "sm" ? "text-muted-foreground" : undefined}
            disabled={pending}
            aria-label={`Việc khác với khoản mượn của ${loan.counterparty}`}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => openAfterMenu(setEditing)}>
            <Pencil /> Sửa thông tin
          </DropdownMenuItem>
          {status === "ACTIVE" ? (
            <>
              {/* onSelect + openAfterMenu, KHÔNG phải onClick: hai mục này giờ
                  MỞ DIALOG thay vì chạy ngay, và mở dialog trong cùng nhịp với
                  cú chạm sẽ bị chính cú `pointerup` đó đóng lại — xem ghi chú
                  ở openAfterMenu. Dùng onClick ở đây cho ra một hộp thoại
                  "trông như không làm gì" trên iPhone. */}
              <DropdownMenuItem onSelect={() => openAfterMenu(setConfirmingPaid)}>
                <CheckCircle2 className="size-4" /> Đánh dấu đã trả xong
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openAfterMenu(setConfirmingCancel)}>
                <XCircle /> Bỏ khoản này
              </DropdownMenuItem>
            </>
          ) : (
            /* Mở lại vẫn chạy ngay: nó THÊM thông tin chứ không giấu đi. */
            <DropdownMenuItem
              onClick={() => run(() => setLoanStatus(loan.id, "ACTIVE"), "Đã mở lại khoản này")}
            >
              <RotateCcw /> Mở lại — vẫn còn nợ
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() => openAfterMenu(setConfirmingDelete)}
          >
            <Trash2 /> Xoá hẳn khoản này
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditLoanDialog groupId={groupId} loan={loan} open={editing} onOpenChange={setEditing} />

      {/* Xoá khoản mượn là mất luôn cả lịch sử thu/trả — hỏi lại trước khi xoá.
          Câu chữ lấy đúng bản ở loan-action-list: trước đây đây là một <Dialog>
          tự viết, chép gần như từng chữ nhưng lệch nhãn nút ("Xoá vĩnh viễn"
          với "Xoá hẳn") — hai lời cho cùng một việc. */}
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Xoá hẳn khoản mượn của ${loan.counterparty}?`}
        description={
          <>
            {formatMoney(loan.amount)}
            {paymentCount > 0
              ? ` và ${paymentCount} lần trả đã ghi sẽ mất luôn, không lấy lại được.`
              : " sẽ mất luôn, không lấy lại được."}{" "}
            Nếu chỉ muốn khép lại khoản này thì dùng “Đánh dấu đã trả xong” hoặc “Bỏ khoản này”.
          </>
        }
        confirmLabel="Xoá hẳn"
        successMessage="Đã xoá khoản mượn"
        onConfirm={() => deleteLoan(loan.id)}
        onDone={() => router.push("/loans?xem=muon")}
      />

      <ConfirmDialog
        open={confirmingPaid}
        onOpenChange={setConfirmingPaid}
        title={`Đánh dấu khoản của ${loan.counterparty} là đã trả xong?`}
        description={markPaidConfirm(loan.type, remaining)}
        confirmLabel="Đánh dấu đã trả xong"
        confirmVariant="default"
        pendingLabel="Đang lưu…"
        cancelLabel="Thôi, để nguyên"
        successMessage="Đã đánh dấu trả xong"
        onConfirm={() => setLoanStatus(loan.id, "PAID")}
      />

      <ConfirmDialog
        open={confirmingCancel}
        onOpenChange={setConfirmingCancel}
        title={`Bỏ khoản mượn của ${loan.counterparty}?`}
        description={cancelLoanConfirm(remaining)}
        confirmLabel="Bỏ khoản này"
        pendingLabel="Đang lưu…"
        successMessage="Đã bỏ khoản này"
        onConfirm={() => setLoanStatus(loan.id, "CANCELLED")}
      />
    </>
  );
}

/**
 * Menu của một lần thu/trả nợ: sửa lại số tiền/ngày, hoặc xoá.
 *
 * Xoá phải qua một bước xác nhận — bấm nhầm vào đây là mất dấu một lần trả tiền
 * thật, và số còn lại của khoản mượn lập tức sai.
 */
export function PaymentActions({
  loanId,
  type,
  payment,
  remainingWithout,
  variant = "menu",
}: {
  loanId: string;
  type: "LEND" | "BORROW";
  payment: EditablePayment;
  remainingWithout: number;
  /** "buttons" = hai nút có chữ, dùng ở trang chi tiết nơi có đủ chỗ. */
  variant?: "menu" | "buttons";
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      {variant === "buttons" ? (
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setEditing(true)}>
            <Pencil /> Sửa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            disabled={pending}
            onClick={() => setConfirming(true)}
          >
            <Trash2 /> Xoá
          </Button>
        </div>
      ) : (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground"
            disabled={pending}
            aria-label="Sửa hoặc xoá lần trả này"
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => openAfterMenu(setEditing)}>
            <Pencil /> Sửa
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onSelect={() => openAfterMenu(setConfirming)}>
            <Trash2 /> Xoá
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      )}

      <EditLoanPaymentDialog
        loanId={loanId}
        type={type}
        payment={payment}
        remainingWithout={remainingWithout}
        open={editing}
        onOpenChange={setEditing}
      />

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá lần trả này?</DialogTitle>
            <DialogDescription>
              {formatMoney(payment.amount)} ngày {formatDate(payment.date)}. Xoá đi thì số còn nợ
              quay về {formatMoney(remainingWithout)}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
              Thôi, giữ lại
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  try {
                    await deleteLoanPayment(payment.id);
                    toast.success("Đã xoá");
                    setConfirming(false);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                })
              }
            >
              {pending ? "Đang xoá…" : "Xoá"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
