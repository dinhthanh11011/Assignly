"use client";
import { call } from "@/lib/action-result";
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
import { FieldError, useValidation } from "@/components/field";
import { addLoanPayment, updateLoanPayment } from "@/lib/actions";
import { dateKey, formatMoney, todayKey } from "@/lib/utils";

export type EditablePayment = {
  id: string;
  /** Bản đã đọc — gửi kèm khi sửa/xoá, xem `LoanPayment.version`. */
  version: number;
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
  const { errors, check, clear } = useValidation<"pay-amount" | "pay-date">();

  const label = type === "LEND" ? "Ghi: họ đã trả tôi" : "Ghi: tôi đã trả họ";
  const excess = amount - remaining;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !check([
        { field: "pay-amount", invalid: amount <= 0, message: "Nhập số tiền lớn hơn 0" },
        { field: "pay-date", invalid: !date, message: "Chọn ngày" },
      ])
    )
      return;
    start(async () => {
      try {
        const payload = { amount, date, note: note.trim() || null };
        if (initial) await call(updateLoanPayment(initial.id, payload, initial.version));
        else await call(addLoanPayment({ loanId, ...payload }));
        toast.success(initial ? "Đã cập nhật" : `Đã ghi nhận: ${label.slice(5)}`);
        onDone();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    // noValidate: xem ghi chú cùng chuyện này ở transaction-dialog.
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
      <DialogBody className="space-y-5">
        <div className="space-y-2">
          <AmountField
            id="pay-amount"
            value={amount}
            onValueChange={(v) => {
              setAmount(v);
              clear("pay-amount");
            }}
            type={type === "LEND" ? "INCOME" : "EXPENSE"}
            autoFocus
            invalid={Boolean(errors["pay-amount"])}
            describedBy={errors["pay-amount"] && "pay-amount-error"}
          />
          <FieldError id="pay-amount-error">{errors["pay-amount"]}</FieldError>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAmount(remaining)}
              className="focus-ring min-h-11 rounded-lg border border-input bg-card px-4 text-label text-foreground transition-colors hover:bg-sunken"
            >
              Trả hết
            </button>
            <button
              type="button"
              onClick={() => setAmount(Math.round(remaining / 2))}
              className="focus-ring min-h-11 rounded-lg border border-input bg-card px-4 text-label text-foreground transition-colors hover:bg-sunken"
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
            id="pay-date"
            label="Ngày"
            value={date}
            onChange={(v) => {
              setDate(v);
              clear("pay-date");
            }}
            required
            showRelative
            invalid={Boolean(errors["pay-date"])}
            error={<FieldError id="pay-date-error">{errors["pay-date"]}</FieldError>}
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
        <Button type="submit" variant="default" size="lg" className="w-full" loading={pending}>
          {pending ? "Đang lưu…" : initial ? "Lưu thay đổi" : `Ghi nhận ${label.slice(5)}`}
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
  compact = false,
  className,
}: {
  loanId: string;
  type: "LEND" | "BORROW";
  counterparty: string;
  remaining: number;
  variant?: "default" | "outline" | "secondary" | "soft";
  size?: "sm" | "default" | "lg";
  /** Nhãn ngắn "Ghi trả" cho thẻ trong danh sách; tên đầy đủ đọc qua sr-only. */
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = type === "LEND" ? "Ghi: họ đã trả tôi" : "Ghi: tôi đã trả họ";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <HandCoins aria-hidden />
          {compact ? (
            <>
              Ghi trả<span className="sr-only"> — {label.slice(5)}, {counterparty}</span>
            </>
          ) : (
            label
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>{type === "LEND" ? `${counterparty} trả bạn` : `Bạn trả ${counterparty}`}</DialogTitle>
          <DialogDescription>
            {type === "LEND" ? `${counterparty} còn nợ bạn` : `Bạn còn nợ ${counterparty}`}{" "}
            <span className="num font-semibold text-foreground">{formatMoney(remaining)}</span>
          </DialogDescription>
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
