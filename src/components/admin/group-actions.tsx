"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { adminDeleteGroup, adminRemoveMember, adminTransferGroupOwnership } from "@/lib/admin-actions";

type Member = { id: string; label: string };

export function GroupDangerZone({
  groupId,
  groupName,
  counts,
  candidates,
}: {
  groupId: string;
  groupName: string;
  /** Hộp thoại xác nhận phải kê ĐÚNG những gì sẽ mất, không nói chung chung. */
  counts: { transactions: number; loans: number; settlements: number; members: number };
  /** Thành viên có thể nhận sổ — đã loại chủ hiện tại ở phía server. */
  candidates: Member[];
}) {
  const router = useRouter();
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toUserId, setToUserId] = useState("");

  const receiver = candidates.find((c) => c.id === toUserId);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-label text-muted-foreground">Giao sổ cho người khác</h3>
        <p className="text-caption text-muted-foreground">
          Sổ luôn phải có người đứng tên, nên đây là việc phải làm trước khi khoá tài khoản của
          người lập sổ.
        </p>
        {candidates.length === 0 ? (
          <p className="text-caption text-muted-foreground">
            Sổ này chỉ có một người, chưa giao cho ai được.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Chọn người nhận sổ" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!toUserId} onClick={() => setTransferOpen(true)}>
              <Crown className="size-5" />
              Giao sổ
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-5">
        <h3 className="text-label text-muted-foreground">Xoá sổ</h3>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="size-5" />
          Xoá sổ này
        </Button>
      </div>

      <ConfirmDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title="Giao sổ cho người này?"
        description={`${receiver?.label ?? "Người được chọn"} sẽ thành người lập sổ “${groupName}” — quản lý được người trong sổ và xoá được sổ. Người lập sổ hiện tại xuống làm người quản lý. Không khoản ghi nào bị ảnh hưởng.`}
        confirmLabel="Giao sổ"
        confirmVariant="default"
        pendingLabel="Đang giao sổ…"
        cancelLabel="Thôi"
        successMessage="Đã giao sổ"
        onConfirm={() => adminTransferGroupOwnership(groupId, toUserId)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xoá sổ này?"
        description={`Xoá sổ “${groupName}” sẽ xoá ${counts.transactions} khoản ghi, ${counts.loans} khoản mượn và ${counts.settlements} lần cân đối của ${counts.members} người. Không lấy lại được.`}
        confirmLabel="Xoá sổ này"
        successMessage="Đã xoá sổ"
        onConfirm={() => adminDeleteGroup(groupId)}
        onDone={() => router.push("/admin/groups")}
      />
    </div>
  );
}

/** Nút gỡ một người ra khỏi sổ, đặt ở cuối hàng của họ trong bảng thành viên. */
export function RemoveMemberButton({
  groupId,
  userId,
  name,
  groupName,
}: {
  groupId: string;
  userId: string;
  name: string;
  groupName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Mời ra
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Mời người này ra khỏi sổ?"
        description={`${name} sẽ không xem hay ghi được gì trong sổ “${groupName}” nữa. Những khoản họ đã ghi VẪN Ở LẠI trong sổ, và phần họ phải chịu trong các khoản đã tiêu cũng giữ nguyên. Họ xin vào lại được sau này.`}
        confirmLabel="Mời người này ra"
        pendingLabel="Đang gỡ…"
        successMessage="Đã mời người này ra khỏi sổ"
        onConfirm={() => adminRemoveMember(groupId, userId)}
      />
    </>
  );
}
