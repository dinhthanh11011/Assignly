"use client";
import { useState, useTransition } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { loanPartyQuestion, loanSideLabel } from "@/lib/copy";
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
import { DateField } from "@/components/date-field";
import { createLoan, updateLoan } from "@/lib/actions";
import { dateKey, shiftDateKey, todayKey } from "@/lib/utils";

export type LoanType = "LEND" | "BORROW";

/** Mốc hạn trả bấm nhanh, tính từ ngày phát sinh. */
const DUE_PRESETS = [
  { label: "1 tuần", days: 7 },
  { label: "2 tuần", days: 14 },
  { label: "1 tháng", days: 30 },
  { label: "3 tháng", days: 90 },
];

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
  const [date, setDate] = useState(initial ? dateKey(initial.date) : todayKey());
  const [dueDate, setDueDate] = useState(initial?.dueDate ? dateKey(initial.dueDate) : "");
  const [interestRate, setInterestRate] = useState(
    initial?.interestRate != null ? String(initial.interestRate) : ""
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, start] = useTransition();
  // Sửa một khoản đã có hẹn trả / lãi / ghi chú thì bung sẵn mục chi tiết —
  // không bao giờ giấu dữ liệu đã nhập khỏi chính màn hình sửa nó.
  const hasDetails = Boolean(initial?.dueDate || initial?.interestRate || initial?.note);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Nhập số tiền lớn hơn 0");
      return;
    }
    if (!date) {
      toast.error("Chọn ngày mượn");
      return;
    }
    if (dueDate && dueDate < date) {
      toast.error("Hẹn ngày trả không thể trước ngày phát sinh");
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
        toast.success(initial ? "Đã cập nhật" : "Đã tạo khoản mượn");
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
            { value: "LEND", label: loanSideLabel("LEND"), tone: "income" },
            { value: "BORROW", label: loanSideLabel("BORROW"), tone: "expense" },
          ]}
        />

        <AmountField
          value={amount}
          onValueChange={setAmount}
          type={type === "LEND" ? "INCOME" : "EXPENSE"}
        />

        <div className="space-y-2">
          <Label htmlFor="counterparty">{loanPartyQuestion(type)}</Label>
          <Input
            id="counterparty"
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
            placeholder="VD: Anh Nam"
            required
            autoFocus
          />
        </div>

        <DateField id="loan-date" label="Ngày mượn" value={date} onChange={setDate} required />

        {/* Ba thứ dưới đây đều KHÔNG bắt buộc, và "lãi %/tháng" là câu hỏi làm
            người ghi lần đầu khựng lại. Gom vào một mục mở ra được: người cần
            thì bấm một cái là có đủ, người không cần thì không phải nhìn.
            Tự bung sẵn khi sửa một khoản đã có sẵn mấy giá trị này. */}
        <details className="group rounded-xl border border-border bg-sunken" open={hasDetails}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-4 text-body font-semibold marker:content-none">
            <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" />
            Thêm chi tiết (không bắt buộc)
          </summary>

          <div className="space-y-5 border-t border-border p-4">
            <DateField
              id="due-date"
              label="Hẹn ngày trả"
              value={dueDate}
              onChange={setDueDate}
              hint={
                dueDate
                  ? undefined
                  : // Cảnh báo "cần nhắc" dựa vào ngày hẹn trả; bỏ trống là mất luôn.
                    "Chưa hẹn ngày trả — app sẽ không nhắc bạn."
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {DUE_PRESETS.map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => setDueDate(shiftDateKey(date, p.days))}
                    className="min-h-11 rounded-lg border border-input bg-card px-4 text-label text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </DateField>

            <div className="space-y-2">
              <Label htmlFor="rate">Có tính lãi không? (% mỗi tháng)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="Để trống nếu không tính lãi"
                className="sm:max-w-[16rem]"
              />
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
          </div>
        </details>
      </DialogBody>

      <DialogFooter>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Đang lưu…" : initial ? "Lưu thay đổi" : "Ghi khoản mượn này"}
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
  /** Chỉ để hiện "Ghi vào sổ: X" trong sheet; khung app đã cho biết sổ nào. */
  groupName?: string;
  defaultType?: LoanType;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Trên điện thoại đã có nút "+" nổi giữa thanh nav (tab Vay nợ) */}
        <Button variant="gradient" className="hidden md:inline-flex">
          <Plus /> Ghi khoản mượn
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>Ghi khoản mượn</DialogTitle>
          <DialogDescription>
            Ghi lại tiền bạn cho người khác vay hoặc tiền bạn bạn nợ họ.
          </DialogDescription>
          {groupName && <GroupBadge groupName={groupName} />}
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
          <DialogTitle>Sửa khoản mượn</DialogTitle>
        </DialogHeader>
        {open && <LoanForm groupId={groupId} initial={loan} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
