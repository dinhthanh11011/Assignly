"use client";
import { useState, useTransition } from "react";
import { HandCoins, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AmountField } from "@/components/money-input";
import { DateField } from "@/components/date-field";
import { addLoanPayment, updateLoanPayment } from "@/lib/actions";
import { dateKey, formatMoney, todayKey } from "@/lib/utils";

export type EditablePayment = {
  id: string;
  amount: number;
  date: Date;
  note: string | null;
};

/**
 * Form ghi nhận / sửa một lần thu nợ (cho vay) hoặc trả nợ (đi vay).
 *
 * `remaining` là số còn lại **không tính** lần đang sửa, nên khi sửa cũng so
 * đúng: nhập vượt phần đó là dấu hiệu ghi sai số tiền.
 */
function LoanPaymentForm({
  loanId,
  type,
  remaining,
  initial,
  onDone,
}: {
  loanId: string;
  type: "LEND" | "BORROW";
  remaining: number;
  initial?: EditablePayment;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(initial?.amount ?? remaining);
  const [date, setDate] = useState(initial ? dateKey(initial.date) : todayKey());
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, start] = useTransition();

  const label = type === "LEND" ? "Ghi: họ đã trả tôi" : "Ghi: tôi đã trả họ";
  const excess = amount - remaining;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Nhập số tiền lớn hơn 0");
      return;
    }
    if (!date) {
      toast.error("Chọn ngày");
      return;
    }
    start(async () => {
      try {
        const payload = { amount, date, note: note.trim() || null };
        if (initial) await updateLoanPayment(initial.id, payload);
        else await addLoanPayment({ loanId, ...payload });
        toast.success(initial ? "Đã cập nhật" : `Đã ghi nhận ${label.toLowerCase()}`);
        onDone();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-5">
      <DialogBody className="space-y-5">
        <div className="space-y-2">
          <AmountField
            value={amount}
            onValueChange={setAmount}
            type={type === "LEND" ? "INCOME" : "EXPENSE"}
            autoFocus
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setAmount(remaining)}
              className="min-h-11 rounded-lg border border-input bg-card px-4 text-label text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Trả hết
            </button>
            <button
              type="button"
              onClick={() => setAmount(Math.round(remaining / 2))}
              className="min-h-11 rounded-lg border border-input bg-card px-4 text-label text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Trả một nửa
            </button>
          </div>
          {/* Vượt số còn lại thường là gõ thừa/thiếu một số 0 — nói ngay để soát lại */}
          {excess > 0 && (
            <p className="flex items-start gap-2 rounded-md border border-warning bg-warning-surface px-3 py-2.5 text-body">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
              <span>
                Nhiều hơn số còn nợ {formatMoney(excess)}. Nếu là tiền lãi thì bỏ qua, còn không
                thì soát lại số tiền.
              </span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          <DateField
            id={initial ? `payment-date-${initial.id}` : "payment-date"}
            label="Ngày"
            value={date}
            onChange={setDate}
            required
          />
          <div className="space-y-2">
            <Label htmlFor="payment-note">Ghi chú</Label>
            <Input
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: trả đợt 1"
            />
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={pending}>
          {pending ? "Đang lưu…" : initial ? "Lưu thay đổi" : `Ghi nhận ${label.toLowerCase()}`}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Ghi nhận một lần thu nợ (cho vay) hoặc trả nợ (đi vay). */
export function LoanPaymentButton({
  loanId,
  type,
  counterparty,
  remaining,
  variant = "default",
  size,
  className,
}: {
  loanId: string;
  type: "LEND" | "BORROW";
  counterparty: string;
  remaining: number;
  variant?: "default" | "outline" | "secondary" | "soft";
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = type === "LEND" ? "Ghi: họ đã trả tôi" : "Ghi: tôi đã trả họ";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <HandCoins /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>
            {label} · {counterparty}
          </DialogTitle>
          <DialogDescription>Còn nợ {formatMoney(remaining)}</DialogDescription>
        </DialogHeader>
        {/* Mở lại thì form khởi tạo lại, gợi ý đúng số còn lại tại thời điểm đó */}
        {open && (
          <LoanPaymentForm
            loanId={loanId}
            type={type}
            remaining={remaining}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EditLoanPaymentDialog({
  loanId,
  type,
  payment,
  remainingWithout,
  open,
  onOpenChange,
}: {
  loanId: string;
  type: "LEND" | "BORROW";
  payment: EditablePayment;
  /** Số còn lại nếu bỏ lần thanh toán này ra — mốc để cảnh báo nhập vượt. */
  remainingWithout: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>Sửa lần trả này</DialogTitle>
          <DialogDescription>
            Chưa tính lần này thì còn nợ {formatMoney(remainingWithout)}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <LoanPaymentForm
            loanId={loanId}
            type={type}
            remaining={remainingWithout}
            initial={payment}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
