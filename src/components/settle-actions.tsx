"use client";
import { useState, useTransition } from "react";
import { Handshake, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { SettlementDialog, type SettlementDraft } from "@/components/settlement-dialog";
import { type MemberOption } from "@/lib/member";
import { deleteSettlement } from "@/lib/actions";

/**
 * Nút mở form ghi nhận chuyển tiền. `draft` điền sẵn hai bên và số tiền khi bấm
 * từ một lượt chuyển được gợi ý.
 */
export function SettleButton({
  groupId,
  members,
  draft,
  label = "Ghi nhận",
  variant = "soft",
  size = "sm",
}: {
  groupId: string;
  members: MemberOption[];
  draft: SettlementDraft;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [open, setOpen] = useState(false);
  // Đổi key mỗi lần mở → form luôn khởi tạo lại từ `draft` hiện tại.
  const [round, setRound] = useState(0);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => {
          setRound((r) => r + 1);
          setOpen(true);
        }}
      >
        <Handshake className="size-4" /> {label}
      </Button>
      <SettlementDialog
        key={round}
        groupId={groupId}
        members={members}
        draft={draft}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

export function DeleteSettlementButton({ settlementId }: { settlementId: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Xoá lần chuyển tiền này"
      disabled={pending}
      className="shrink-0 text-muted-foreground hover:text-destructive"
      onClick={() =>
        start(async () => {
          try {
            await deleteSettlement(settlementId);
            toast.success("Đã xoá lần chuyển tiền");
          } catch (err) {
            toast.error((err as Error).message);
          }
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
