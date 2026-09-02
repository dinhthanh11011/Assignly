"use client";
import { useState, useTransition } from "react";
import { ArrowRight, Handshake } from "lucide-react";
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
} from "@/components/ui/dialog";
import { AmountField } from "@/components/money-input";
import { DateField } from "@/components/date-field";
import { FieldError, useValidation } from "@/components/field";
import { MemberAvatar } from "@/components/member-avatar";
import { memberLabel, type MemberOption } from "@/lib/member";
import { createSettlement, updateSettlement } from "@/lib/actions";
import { cn, formatMoney, todayKey } from "@/lib/utils";

export type SettlementDraft = {
  fromUserId: string;
  toUserId: string;
  amount: number;
  /** Chỉ điền khi đang sửa; ghi mới thì mặc định hôm nay. */
  date?: string;
  note?: string | null;
};

/**
 * Ghi nhận một lần chuyển tiền cân bằng. Mở từ một lượt chuyển được gợi ý (điền
 * sẵn đủ ba thông tin) hoặc từ nút chung (tự chọn hai bên).
 *
 * Có `settlementId` thì cùng form này chuyển sang chế độ sửa — các ô giống hệt
 * nhau nên tách ra hai form chỉ để đổi một lời gọi action là thừa.
 */
export function SettlementDialog({
  groupId,
  members,
  draft,
  settlementId,
  open,
  onOpenChange,
}: {
  groupId: string;
  members: MemberOption[];
  draft: SettlementDraft;
  /** Có = đang sửa lần đưa tiền này, không có = ghi mới. */
  settlementId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = Boolean(settlementId);
  const [fromUserId, setFrom] = useState(draft.fromUserId);
  const [toUserId, setTo] = useState(draft.toUserId);
  const [amount, setAmount] = useState(draft.amount);
  const [date, setDate] = useState(draft.date ?? todayKey());
  const [note, setNote] = useState(draft.note ?? "");
  const [pending, start] = useTransition();
  const { errors, check, clear } = useValidation<
    "settle-from" | "settle-to" | "settle-amount" | "settle-date"
  >();

  const from = members.find((m) => m.id === fromUserId);
  const to = members.find((m) => m.id === toUserId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !check([
        { field: "settle-from", invalid: !fromUserId, message: "Chọn người đưa tiền" },
        { field: "settle-to", invalid: !toUserId, message: "Chọn người nhận tiền" },
        // Gắn vào ô THỨ HAI: khi hai bên trùng nhau, cái người dùng cần đổi gần
        // như luôn là người nhận — đưa họ tới ô đầu là bắt họ tự đoán tiếp.
        {
          field: "settle-to",
          invalid: Boolean(fromUserId) && fromUserId === toUserId,
          message: "Hai người phải khác nhau",
        },
        { field: "settle-amount", invalid: amount <= 0, message: "Nhập số tiền lớn hơn 0" },
        { field: "settle-date", invalid: !date, message: "Chọn ngày" },
      ])
    )
      return;
    start(async () => {
      try {
        const payload = { fromUserId, toUserId, amount, date, note: note.trim() || null };
        if (settlementId) await updateSettlement(settlementId, payload);
        else await createSettlement({ groupId, ...payload });
        toast.success(settlementId ? "Đã cập nhật" : "Đã ghi nhận chuyển tiền");
        onOpenChange(false);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>{editing ? "Sửa lần đưa tiền" : "Ghi: đã đưa tiền cho nhau"}</DialogTitle>
          <DialogDescription>
            {from && to
              ? `${memberLabel(from)} đã đưa tiền cho ${memberLabel(to)}.`
              : "Chọn ai đã đưa tiền cho ai, để trừ bớt phần nợ nhau."}
          </DialogDescription>
        </DialogHeader>

        {/* noValidate: xem ghi chú cùng chuyện này ở transaction-dialog. */}
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
          <DialogBody className="space-y-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
              <MemberPicker
                id="settle-from"
                label="Ai đưa tiền?"
                members={members}
                value={fromUserId}
                onChange={(v) => {
                  setFrom(v);
                  clear("settle-from");
                }}
                error={<FieldError id="settle-from-error">{errors["settle-from"]}</FieldError>}
              />
              <ArrowRight className="mb-3 size-4 shrink-0 text-muted-foreground" />
              <MemberPicker
                id="settle-to"
                label="Đưa cho ai?"
                members={members}
                value={toUserId}
                onChange={(v) => {
                  setTo(v);
                  clear("settle-to");
                }}
                error={<FieldError id="settle-to-error">{errors["settle-to"]}</FieldError>}
              />
            </div>

            <AmountField
              id="settle-amount"
              value={amount}
              onValueChange={(v) => {
                setAmount(v);
                clear("settle-amount");
              }}
              type="EXPENSE"
              invalid={Boolean(errors["settle-amount"])}
              describedBy={errors["settle-amount"] && "settle-amount-error"}
            />
            <FieldError id="settle-amount-error">{errors["settle-amount"]}</FieldError>
            {!editing && draft.amount > 0 && amount !== draft.amount && (
              <button
                type="button"
                onClick={() => setAmount(draft.amount)}
                className="min-h-11 rounded-lg border border-input bg-card px-4 text-label text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Dùng đúng số gợi ý ({formatMoney(draft.amount)})
              </button>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
              <DateField
                id="settle-date"
                label="Ngày"
                value={date}
                onChange={(v) => {
                  setDate(v);
                  clear("settle-date");
                }}
                required
                showRelative
                invalid={Boolean(errors["settle-date"])}
                error={<FieldError id="settle-date-error">{errors["settle-date"]}</FieldError>}
              />
              <div className="space-y-2">
                <Label htmlFor="settle-note">Ghi chú</Label>
                <Input
                  id="settle-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: chuyển khoản Momo"
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
              <Handshake className="size-4" />
              {pending ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Ghi nhận"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberPicker({
  id,
  label,
  members,
  value,
  onChange,
  error,
}: {
  /** Khoá luật của useValidation — check() cuộn tới đây bằng getElementById. */
  id: string;
  label: string;
  members: MemberOption[];
  value: string;
  onChange: (id: string) => void;
  error?: React.ReactNode;
}) {
  return (
    // tabIndex={-1} + role="group": đây là một danh sách nút, không có control
    // đơn nào để <Label htmlFor> trỏ tới và cũng không có gì focus được — mà
    // check() cần cả hai thì mới đưa được người dùng tới đúng ô sai.
    <div
      id={id}
      tabIndex={-1}
      role="group"
      aria-labelledby={`${id}-label`}
      className="min-w-0 space-y-2 outline-none"
    >
      <Label asChild>
        <span id={`${id}-label`}>{label}</span>
      </Label>
      <div className="scroll-fade flex max-h-36 flex-col gap-1 overflow-y-auto">
        {members.map((m) => {
          const on = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              aria-pressed={on}
              className={cn(
                "flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 text-left text-caption font-semibold transition-colors",
                on
                  ? "border-primary bg-primary-surface text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <MemberAvatar user={m} className="size-6 shrink-0" />
              <span className="min-w-0 truncate">{memberLabel(m)}</span>
            </button>
          );
        })}
      </div>
      {error}
    </div>
  );
}
