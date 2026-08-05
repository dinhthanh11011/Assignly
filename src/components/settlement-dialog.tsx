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
import { MemberAvatar } from "@/components/member-avatar";
import { memberLabel, type MemberOption } from "@/components/split-editor";
import { createSettlement } from "@/lib/actions";
import { cn, dateKey, formatMoney } from "@/lib/utils";

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
  const [date, setDate] = useState(dateKey(new Date()));
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
      toast.error("Người trả và người nhận phải khác nhau");
      return;
    }
    if (amount <= 0) {
      toast.error("Nhập số tiền lớn hơn 0");
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
          <DialogTitle>Ghi nhận chuyển tiền</DialogTitle>
          <DialogDescription>
            {from && to
              ? `${memberLabel(from)} đã trả ${memberLabel(to)} để bù chênh lệch.`
              : "Chọn ai đã trả cho ai để bù chênh lệch chi tiêu."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-5">
          <DialogBody className="space-y-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <MemberPicker
                label="Người trả"
                members={members}
                value={fromUserId}
                onChange={setFrom}
              />
              <ArrowRight className="mb-3 size-4 shrink-0 text-muted-foreground" />
              <MemberPicker
                label="Người nhận"
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
                className="rounded-full bg-sunken px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
              >
                Đúng số gợi ý ({formatMoney(draft.amount)})
              </button>
            )}

            <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_1fr]">
              <div className="space-y-2">
                <Label htmlFor="settle-date">Ngày</Label>
                <Input
                  id="settle-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
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
      <div className="no-scrollbar flex max-h-36 flex-col gap-1 overflow-y-auto">
        {members.map((m) => {
          const on = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              aria-pressed={on}
              className={cn(
                "flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 text-left text-xs font-semibold transition-colors",
                on
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-hairline bg-card text-muted-foreground hover:text-foreground"
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
