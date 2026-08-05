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
  size = "default",
}: {
  groupId: string;
  loan: EditableLoan;
  status: "ACTIVE" | "PAID" | "CANCELLED";
  /** Số lần thu/trả sẽ mất theo khi xoá khoản vay — hiện trong bước xác nhận. */
  paymentCount?: number;
  /** "sm" cho nút gọn đặt trong thẻ danh sách. */
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<unknown>, message: string, back = false) {
    start(async () => {
      try {
        await fn();
        toast.success(message);
        if (back) router.push("/loans");
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
            aria-label="Tuỳ chọn khoản vay"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => openAfterMenu(setEditing)}>
            <Pencil className="size-4" /> Sửa thông tin
          </DropdownMenuItem>
          {status === "ACTIVE" ? (
            <>
              <DropdownMenuItem
                onClick={() => run(() => setLoanStatus(loan.id, "PAID"), "Đã đánh dấu tất toán")}
              >
                <CheckCircle2 className="size-4" /> Đánh dấu tất toán
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => run(() => setLoanStatus(loan.id, "CANCELLED"), "Đã huỷ khoản vay")}
              >
                <XCircle className="size-4" /> Huỷ / xoá nợ
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              onClick={() => run(() => setLoanStatus(loan.id, "ACTIVE"), "Đã mở lại khoản vay")}
            >
              <RotateCcw className="size-4" /> Mở lại khoản vay
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() => openAfterMenu(setConfirmingDelete)}
          >
            <Trash2 className="size-4" /> Xoá khoản vay
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditLoanDialog groupId={groupId} loan={loan} open={editing} onOpenChange={setEditing} />

      {/* Xoá khoản vay là mất luôn cả lịch sử thu/trả — hỏi lại trước khi xoá */}
      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá khoản vay của {loan.counterparty}?</DialogTitle>
            <DialogDescription>
              {formatMoney(loan.amount)}
              {paymentCount > 0
                ? ` và ${paymentCount} lần thu/trả đã ghi sẽ bị xoá vĩnh viễn.`
                : " sẽ bị xoá vĩnh viễn."}{" "}
              Nếu chỉ muốn khép lại khoản này, hãy dùng “Đánh dấu tất toán” hoặc “Huỷ / xoá nợ”.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmingDelete(false)}
              disabled={pending}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => deleteLoan(loan.id), "Đã xoá khoản vay", true)}
            >
              {pending ? "Đang xoá…" : "Xoá vĩnh viễn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Menu của một lần thu/trả nợ: sửa lại số tiền/ngày, hoặc xoá.
 *
 * Xoá phải qua một bước xác nhận — bấm nhầm vào đây là mất dấu một lần trả tiền
 * thật, và số còn lại của khoản vay lập tức sai.
 */
export function PaymentActions({
  loanId,
  type,
  payment,
  remainingWithout,
}: {
  loanId: string;
  type: "LEND" | "BORROW";
  payment: EditablePayment;
  remainingWithout: number;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground"
            disabled={pending}
            aria-label="Tuỳ chọn lần thanh toán"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => openAfterMenu(setEditing)}>
            <Pencil className="size-4" /> Sửa
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onSelect={() => openAfterMenu(setConfirming)}>
            <Trash2 className="size-4" /> Xoá
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
            <DialogTitle>Xoá lần {type === "LEND" ? "thu" : "trả"} nợ này?</DialogTitle>
            <DialogDescription>
              {formatMoney(payment.amount)} · {formatDate(payment.date)}. Sau khi xoá, số còn lại
              của khoản vay quay về {formatMoney(remainingWithout)}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
              Huỷ
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
