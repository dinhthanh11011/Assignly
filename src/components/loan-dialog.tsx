"use client";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { GroupBadge } from "@/components/group-badge";
import { Segmented } from "@/components/segmented";
import { createLoan, updateLoan } from "@/lib/actions";
import { dateKey } from "@/lib/utils";

export type LoanType = "LEND" | "BORROW";

export type EditableLoan = {
  id: string;
  type: LoanType;
  counterparty: string;
  amount: number;
  date: Date;
  dueDate: Date | null;
  interestRate: number | null;
  note: string | null;
};

export function LoanForm({
  groupId,
  initial,
  defaultType,
  onDone,
}: {
  groupId: string;
  initial?: EditableLoan;
  defaultType?: LoanType;
  onDone: () => void;
}) {
  const [type, setType] = useState<LoanType>(initial?.type ?? defaultType ?? "LEND");
  const [counterparty, setCounterparty] = useState(initial?.counterparty ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [date, setDate] = useState(initial ? dateKey(initial.date) : dateKey(new Date()));
  const [dueDate, setDueDate] = useState(initial?.dueDate ? dateKey(initial.dueDate) : "");
  const [interestRate, setInterestRate] = useState(
    initial?.interestRate != null ? String(initial.interestRate) : ""
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Nhập số tiền lớn hơn 0");
      return;
    }
    start(async () => {
      try {
        const payload = {
          type,
          counterparty: counterparty.trim(),
          amount,
          date,
          dueDate: dueDate || null,
          interestRate: interestRate ? Number(interestRate) : null,
          note: note.trim() || null,
        };
        if (initial) await updateLoan(initial.id, payload);
        else await createLoan({ groupId, ...payload });
        toast.success(initial ? "Đã cập nhật" : "Đã tạo khoản vay");
        onDone();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    // Form chiếm hết chiều cao sheet: phần nhập cuộn, nút lưu luôn thấy được.
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-5">
      <DialogBody className="space-y-5">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "LEND", label: "Cho vay", tone: "income" },
            { value: "BORROW", label: "Đi vay", tone: "expense" },
          ]}
        />

        <AmountField
          value={amount}
          onValueChange={setAmount}
          type={type === "LEND" ? "INCOME" : "EXPENSE"}
        />

        <div className="space-y-2">
          <Label htmlFor="counterparty">
            {type === "LEND" ? "Người vay tiền của bạn" : "Người bạn vay"}
          </Label>
          <Input
            id="counterparty"
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
            placeholder="VD: Anh Nam"
            required
            autoFocus
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="loan-date">Ngày phát sinh</Label>
            <Input
              id="loan-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due-date">Hạn trả</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Lãi %/tháng</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="loan-note">Ghi chú</Label>
          <Textarea
            id="loan-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="VD: chuyển khoản Vietcombank"
          />
        </div>
      </DialogBody>

      <DialogFooter>
        <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={pending}>
          {pending ? "Đang lưu…" : initial ? "Lưu thay đổi" : "Tạo khoản vay"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddLoanButton({
  groupId,
  groupName,
  defaultType,
}: {
  groupId: string;
  groupName: string;
  defaultType?: LoanType;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Trên điện thoại đã có nút "+" nổi giữa thanh nav (tab Vay nợ) */}
        <Button variant="gradient" className="hidden md:inline-flex">
          <Plus className="size-4" /> Khoản vay mới
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>Khoản vay mới</DialogTitle>
          <DialogDescription>
            Ghi lại tiền bạn cho người khác vay hoặc tiền bạn đang nợ.
          </DialogDescription>
          <GroupBadge groupName={groupName} />
        </DialogHeader>
        {open && (
          <LoanForm groupId={groupId} defaultType={defaultType} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EditLoanDialog({
  groupId,
  loan,
  open,
  onOpenChange,
}: {
  groupId: string;
  loan: EditableLoan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>Sửa khoản vay</DialogTitle>
        </DialogHeader>
        {open && <LoanForm groupId={groupId} initial={loan} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
