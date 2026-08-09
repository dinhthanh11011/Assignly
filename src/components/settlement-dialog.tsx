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
import { MemberAvatar } from "@/components/member-avatar";
import { memberLabel, type MemberOption } from "@/lib/member";
import { createSettlement } from "@/lib/actions";
import { cn, formatMoney, todayKey } from "@/lib/utils";

export type SettlementDraft = { fromUserId: string; toUserId: string; amount: number };

/**
 * Ghi nhận một lần chuyển tiền cân bằng. Mở từ một lượt chuyển được gợi ý (điền
 * sẵn đủ ba thông tin) hoặc từ nút chung (tự chọn hai bên).
 */
export function SettlementDialog({
  groupId,
  members,
  draft,
  open,
  onOpenChange,
}: {
  groupId: string;
  members: MemberOption[];
  draft: SettlementDraft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [fromUserId, setFrom] = useState(draft.fromUserId);
  const [toUserId, setTo] = useState(draft.toUserId);
  const [amount, setAmount] = useState(draft.amount);
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const from = members.find((m) => m.id === fromUserId);
  const to = members.find((m) => m.id === toUserId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromUserId || !toUserId) {
      toast.error("Chọn người trả và người nhận");
      return;
    }
    if (fromUserId === toUserId) {
      toast.error("Hai người phải khác nhau");
      return;
    }
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
        await createSettlement({
          groupId,
          fromUserId,
          toUserId,
          amount,
          date,
          note: note.trim() || null,
        });
        toast.success("Đã ghi nhận chuyển tiền");
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
          <DialogTitle>Ghi: đã đưa tiền cho nhau</DialogTitle>
          <DialogDescription>
            {from && to
              ? `${memberLabel(from)} đã đưa tiền cho ${memberLabel(to)}.`
              : "Chọn ai đã đưa tiền cho ai, để trừ bớt phần nợ nhau."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-5">
          <DialogBody className="space-y-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
              <MemberPicker
                label="Ai đưa tiền?"
                members={members}
                value={fromUserId}
                onChange={setFrom}
              />
              <ArrowRight className="mb-3 size-4 shrink-0 text-muted-foreground" />
              <MemberPicker
                label="Đưa cho ai?"
                members={members}
                value={toUserId}
                onChange={setTo}
              />
            </div>

            <AmountField value={amount} onValueChange={setAmount} type="EXPENSE" />
            {draft.amount > 0 && amount !== draft.amount && (
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
                onChange={setDate}
                required
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
              {pending ? "Đang lưu…" : "Ghi nhận"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberPicker({
  label,
  members,
  value,
  onChange,
}: {
  label: string;
  members: MemberOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label>{label}</Label>
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
    </div>
  );
}
