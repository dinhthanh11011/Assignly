"use client";
import { useState } from "react";
import { Handshake, Pencil, Trash2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { SettlementDialog, type SettlementDraft } from "@/components/settlement-dialog";
import { ConfirmButton } from "@/components/confirm-dialog";
import { type MemberOption } from "@/lib/member";
import { deleteSettlement } from "@/lib/actions";
import { formatMoney } from "@/lib/utils";

/**
 * Nút mở form ghi nhận chuyển tiền. `draft` điền sẵn hai bên và số tiền khi bấm
 * từ một lượt chuyển được gợi ý.
 */
export function SettleButton({
  groupId,
  members,
  draft,
  label = "Ghi lại",
  variant = "soft",
  size = "sm",
  className,
}: {
  groupId: string;
  members: MemberOption[];
  draft: SettlementDraft;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
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
        className={className}
        onClick={() => {
          setRound((r) => r + 1);
          setOpen(true);
        }}
      >
        <Handshake /> {label}
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

/**
 * Sửa một lần đưa tiền đã ghi. Tách khỏi `SettleButton` vì nút này là icon nằm
 * trong hàng lịch sử, và form phải mở ra với đúng ngày + ghi chú cũ.
 */
export function EditSettlementButton({
  groupId,
  members,
  settlementId,
  draft,
}: {
  groupId: string;
  members: MemberOption[];
  settlementId: string;
  draft: SettlementDraft;
}) {
  const [open, setOpen] = useState(false);
  // Cùng lý do với SettleButton: đổi key để form nạp lại giá trị hiện tại,
  // bỏ những gì đã gõ dở ở lần mở trước.
  const [round, setRound] = useState(0);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Sửa lần đưa tiền này"
        className="shrink-0 text-muted-foreground hover:text-primary"
        onClick={() => {
          setRound((r) => r + 1);
          setOpen(true);
        }}
      >
        <Pencil />
      </Button>
      <SettlementDialog
        key={round}
        groupId={groupId}
        members={members}
        settlementId={settlementId}
        draft={draft}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

export function DeleteSettlementButton({
  settlementId,
  amount,
  fromName,
  toName,
}: {
  settlementId: string;
  amount: number;
  fromName: string;
  toName: string;
}) {
  // Xoá một lần đưa tiền là làm sai lại số nợ của cả hai người — phải hỏi.
  return (
    <ConfirmButton
      aria-label="Xoá lần đưa tiền này"
      className="shrink-0 text-muted-foreground hover:text-destructive"
      title="Xoá lần đưa tiền này?"
      description={`${fromName} đưa ${toName} ${formatMoney(amount)}. Xoá đi thì số nợ giữa hai người quay lại như chưa đưa.`}
      confirmLabel="Xoá lần này"
      successMessage="Đã xoá lần đưa tiền"
      onConfirm={() => deleteSettlement(settlementId)}
    >
      <Trash2 />
    </ConfirmButton>
  );
}
