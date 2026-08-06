"use client";
import { UserMinus } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-dialog";
import { removeMember } from "@/lib/actions";

/**
 * Trước đây dùng `window.confirm` thô của trình duyệt — hộp thoại hệ thống nằm
 * ngoài giao diện app, chữ nhỏ, và trên iOS trong PWA nhìn như lỗi. Nay dùng
 * hộp xác nhận dùng chung, và nói rõ người đó mất quyền gì.
 */
export function RemoveMemberButton({
  groupId,
  userId,
  name,
}: {
  groupId: string;
  userId: string;
  name: string;
}) {
  return (
    <ConfirmButton
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-destructive"
      aria-label={`Mời ${name} ra khỏi sổ`}
      title={`Mời ${name} ra khỏi sổ?`}
      description={`${name} sẽ không xem được sổ này nữa. Những khoản ${name} đã ghi vẫn còn nguyên, và bạn có thể mời lại bất cứ lúc nào.`}
      confirmLabel="Mời ra khỏi sổ"
      pendingLabel="Đang xoá…"
      successMessage={`${name} đã ra khỏi sổ`}
      onConfirm={() => removeMember(groupId, userId)}
    >
      <UserMinus />
    </ConfirmButton>
  );
}
