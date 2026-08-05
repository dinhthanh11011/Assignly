"use client";
import { useState, useTransition } from "react";
import { HandCoins } from "lucide-react";
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
import { addLoanPayment } from "@/lib/actions";
import { dateKey, formatMoney } from "@/lib/utils";

/** Ghi nhận một lần thu nợ (cho vay) hoặc trả nợ (đi vay). */
export function LoanPaymentButton({
  loanId,
  type,
  counterparty,
  remaining,
  variant = "gradient",
  size,
}: {
  loanId: string;
  type: "LEND" | "BORROW";
  counterparty: string;
  remaining: number;
  variant?: "gradient" | "outline" | "secondary" | "soft";
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(remaining);
  const [date, setDate] = useState(dateKey(new Date()));
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const label = type === "LEND" ? "Thu nợ" : "Trả nợ";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Nhập số tiền lớn hơn 0");
      return;
    }
    start(async () => {
      try {
        await addLoanPayment({ loanId, amount, date, note: note.trim() || null });
        toast.success(`Đã ghi nhận ${label.toLowerCase()}`);
        setOpen(false);
        setNote("");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        // Mở lại thì gợi ý sẵn đúng số còn lại tại thời điểm đó.
        if (o) setAmount(remaining);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <HandCoins className="size-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>
            {label} · {counterparty}
          </DialogTitle>
          <DialogDescription>Còn lại {formatMoney(remaining)}</DialogDescription>
        </DialogHeader>
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
                  className="rounded-full bg-sunken px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                  Toàn bộ
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(Math.round(remaining / 2))}
                  className="rounded-full bg-sunken px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                  Một nửa
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_1fr]">
              <div className="space-y-2">
                <Label htmlFor="payment-date">Ngày</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
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
            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Đang lưu…" : `Ghi nhận ${label.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
