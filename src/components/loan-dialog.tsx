"use client";
import { useState, useTransition } from "react";
import { ChevronDown, Plus, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, useValidation } from "@/components/field";
import { cn } from "@/lib/utils";
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
import { ChoiceGroup } from "@/components/ui/choice-group";
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

/** Một lựa chọn của hàng "Khi nào trả?". aria-pressed vì đây là nút bật/tắt. */
function DueChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-ring min-h-11 rounded-lg border px-4 text-label transition-colors",
        active
          ? "border-primary bg-primary-surface font-semibold text-primary"
          : "border-input bg-card text-muted-foreground hover:border-primary hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}

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
  const { errors, check, clear } = useValidation<
    "amount" | "counterparty" | "loan-date" | "due-date"
  >();
  // Ô ngày cụ thể chỉ hiện khi người dùng bấm "Chọn ngày…", hoặc khi đang sửa
  // một khoản có hẹn trả không rơi đúng vào mốc bấm nhanh nào.
  const [showDuePicker, setShowDuePicker] = useState(Boolean(initial?.dueDate));
  // Sửa một khoản đã có lãi / ghi chú thì bung sẵn mục chi tiết — không bao giờ
  // giấu dữ liệu đã nhập khỏi chính màn hình sửa nó. Hạn trả không còn nằm
  // trong mục này nữa nên nó cũng không còn là lý do bung mục ra.
  const hasDetails = Boolean(initial?.interestRate || initial?.note);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !check([
        { field: "amount", invalid: amount <= 0, message: "Nhập số tiền lớn hơn 0" },
        {
          field: "counterparty",
          invalid: !counterparty.trim(),
          message: "Nhập tên người mượn hoặc cho mượn",
        },
        { field: "loan-date", invalid: !date, message: "Chọn ngày mượn" },
        {
          field: "due-date",
          invalid: Boolean(dueDate) && dueDate < date,
          message: "Hẹn ngày trả không thể trước ngày mượn",
        },
      ])
    )
      return;
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
    // noValidate: `required` gốc của trình duyệt chạy TRƯỚC onSubmit, nên nếu
    // để nguyên thì tên trống hiện bong bóng tiếng Anh của hệ điều hành và
    // submit() dưới đây không bao giờ chạy — mọi luật inline thành code chết.
    // Thuộc tính `required` vẫn giữ vì nó mang ngữ nghĩa aria-required.
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
      <DialogBody className="space-y-5">
        <ChoiceGroup
          label="Bạn cho mượn hay bạn đi mượn?"
          value={type}
          onChange={setType}
          options={[
            { value: "LEND", label: loanSideLabel("LEND"), tone: "income" },
            { value: "BORROW", label: loanSideLabel("BORROW"), tone: "expense" },
          ]}
        />

        <div className="space-y-2">
          <AmountField
            value={amount}
            onValueChange={(v) => {
              setAmount(v);
              clear("amount");
            }}
            type={type === "LEND" ? "INCOME" : "EXPENSE"}
            invalid={Boolean(errors.amount)}
            describedBy={errors.amount && "amount-error"}
          />
          <FieldError id="amount-error">{errors.amount}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor="counterparty">{loanPartyQuestion(type)}</Label>
          <Input
            id="counterparty"
            value={counterparty}
            onChange={(e) => {
              setCounterparty(e.target.value);
              clear("counterparty");
            }}
            placeholder="VD: Anh Nam"
            required
            autoFocus
            aria-invalid={Boolean(errors.counterparty) || undefined}
            aria-describedby={errors.counterparty ? "counterparty-error" : undefined}
          />
          <FieldError id="counterparty-error">{errors.counterparty}</FieldError>
        </div>

        <DateField
          id="loan-date"
          label="Ngày mượn"
          value={date}
          onChange={(v) => {
            setDate(v);
            clear("loan-date");
          }}
          required
          invalid={Boolean(errors["loan-date"])}
          error={<FieldError id="loan-date-error">{errors["loan-date"]}</FieldError>}
        />

        {/* HẠN TRẢ NẰM Ở THÂN CHÍNH, không giấu trong mục "không bắt buộc" nữa.
            Cả tính năng nhắc nợ của app — chip "Cần nhắc", thông báo đẩy, badge
            trên tab Nợ, cảnh báo khoản để lâu — đều treo vào đúng giá trị này.
            Trước đây nó vừa không bắt buộc vừa nằm sau một mục gập lại, và câu
            giải thích hậu quả chỉ đọc được SAU KHI bung mục đó ra: nghĩa là hầu
            hết khoản nợ được ghi mà không có hẹn trả, rồi hai tháng sau người
            dùng mới phát hiện app chẳng nhắc gì.

            CỐ Ý KHÔNG ĐẶT MẶC ĐỊNH: đoán hộ một ngày sẽ đẻ ra badge "Trễ hẹn
            trả" sai sự thật và thông báo đẩy về một ngày không ai thoả thuận.
            "Chưa hẹn" phải là một lựa chọn người dùng tự bấm. */}
        <div id="due-date" tabIndex={-1} className="space-y-2 outline-none">
          <Label asChild>
            <span id="due-label">Khi nào trả?</span>
          </Label>
          <div role="group" aria-labelledby="due-label" className="flex flex-wrap gap-1.5">
            {DUE_PRESETS.map((p) => {
              const key = shiftDateKey(date, p.days);
              return (
                <DueChip
                  key={p.days}
                  active={dueDate === key && !showDuePicker}
                  onClick={() => {
                    setDueDate(key);
                    setShowDuePicker(false);
                    clear("due-date");
                  }}
                >
                  {p.label}
                </DueChip>
              );
            })}
            <DueChip active={showDuePicker} onClick={() => setShowDuePicker(true)}>
              Chọn ngày…
            </DueChip>
            <DueChip
              active={!dueDate && !showDuePicker}
              onClick={() => {
                setDueDate("");
                setShowDuePicker(false);
                clear("due-date");
              }}
            >
              Chưa hẹn
            </DueChip>
          </div>

          {showDuePicker && (
            <DateField
              id="due-date-input"
              label="Ngày hẹn trả"
              value={dueDate}
              onChange={(v) => {
                setDueDate(v);
                clear("due-date");
              }}
              invalid={Boolean(errors["due-date"])}
            />
          )}

          <FieldError id="due-date-error">{errors["due-date"]}</FieldError>

          {/* Cảnh báo LUÔN HIỆN khi chưa có hẹn, cùng kiểu với cảnh báo trả dư ở
              loan-payment-dialog. Bản cũ đặt nó làm `hint` bên trong mục gập. */}
          {!dueDate && (
            <p className="flex items-start gap-2 rounded-lg bg-warning-surface p-3 text-caption text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Chưa hẹn ngày trả — app sẽ không nhắc bạn, và khoản này không hiện ở mục “Cần
                nhắc”.
              </span>
            </p>
          )}
        </div>

        {/* "Lãi %/tháng" là câu hỏi làm người ghi lần đầu khựng lại, và cùng với
            ghi chú thì đúng là không bắt buộc — nên hai thứ này vẫn gập lại. */}
        <details className="group rounded-xl border border-border bg-sunken" open={hasDetails}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-4 text-body font-semibold marker:content-none">
            <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" />
            Thêm lãi và ghi chú (không bắt buộc)
          </summary>

          <div className="space-y-5 border-t border-border p-4">
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
