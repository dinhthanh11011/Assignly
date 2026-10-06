"use client";
import { call } from "@/lib/action-result";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-dialog";
import { leaveGroup } from "@/lib/actions";

export function LeaveGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      variant="outline"
      size="sm"
      className="w-full text-destructive sm:w-auto"
      title={`Rời sổ “${groupName}”?`}
      description="Bạn sẽ không xem được sổ này nữa. Những khoản bạn đã ghi vẫn còn nguyên trong sổ. Muốn vào lại thì cần người trong sổ cho bạn mã vào sổ."
      confirmLabel="Rời sổ này"
      pendingLabel="Đang rời…"
      successMessage="Đã rời sổ"
      onConfirm={() => call(leaveGroup(groupId))}
      onDone={() => router.push("/groups")}
    >
      <LogOut /> Rời sổ…
    </ConfirmButton>
  );
}
