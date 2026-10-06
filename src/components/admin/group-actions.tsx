"use client";
import { call } from "@/lib/action-result";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, Trash2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/** Giao sổ cho thành viên khác — lối thoát khi phải khoá người lập sổ. */
export function TransferOwnership({
  groupId,
  groupName,
  candidates,
}: {
  groupId: string;
  groupName: string;
  /** Thành viên có thể nhận sổ — đã loại chủ hiện tại ở phía server. */
  candidates: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [toUserId, setToUserId] = useState("");
  const receiver = candidates.find((c) => c.id === toUserId);
  const selectId = useId();

  if (candidates.length === 0) {
    return (
      <p className="text-body text-muted-foreground">
        Sổ này chỉ có một người nên chưa giao cho ai được.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={selectId}>Người nhận sổ</Label>
      <div className="flex flex-wrap gap-2">
        <Select value={toUserId} onValueChange={setToUserId}>
          <SelectTrigger id={selectId} className="min-w-0 flex-1 basis-48">
            <SelectValue placeholder="Chọn thành viên" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" disabled={!toUserId} onClick={() => setOpen(true)}>
          <Crown aria-hidden />
          Giao sổ
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Giao sổ cho người này?"
        description={`${receiver?.label ?? "Người được chọn"} sẽ thành người lập sổ “${groupName}” — quản lý được người trong sổ và xoá được sổ. Người lập sổ hiện tại xuống làm người quản lý. Không khoản ghi nào bị ảnh hưởng.`}
        confirmLabel="Giao sổ"
        confirmVariant="default"
        pendingLabel="Đang giao sổ…"
        cancelLabel="Thôi"
        successMessage={`Đã giao sổ cho ${receiver?.label ?? "người được chọn"}`}
        onConfirm={() => call(adminTransferGroupOwnership(groupId, toUserId))}
      />
    </div>
  );
}

/**
 * Xoá hẳn một sổ — phải GÕ ĐÚNG TÊN SỔ mới bấm được. Một cú bấm nhầm ở đây
 * xoá dữ liệu của cả nhà, không lấy lại được.
 */
export function DeleteGroup({
  groupId,
  groupName,
  counts,
}: {
  groupId: string;
  groupName: string;
  /** Hộp thoại phải kê ĐÚNG những gì sẽ mất, không nói chung chung. */
  counts: { transactions: number; loans: number; settlements: number; members: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const inputId = useId();
  const matches = typed.trim() === groupName.trim();

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden />
        Xoá sổ này
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (pending) return;
          setOpen(o);
          if (!o) setTyped("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá vĩnh viễn sổ “{groupName}”?</DialogTitle>
            <DialogDescription>
              Sẽ xoá {counts.transactions} khoản ghi, {counts.loans} khoản mượn và {counts.settlements} lần
              cân đối của {counts.members} người. Mọi thành viên mất quyền vào sổ. Không lấy lại được.
            </DialogDescription>
          </DialogHeader>
          <form
            id={`${inputId}-form`}
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!matches || pending) return;
              start(async () => {
                try {
                  await call(adminDeleteGroup(groupId));
                  toast.success(`Đã xoá sổ “${groupName}”`);
                  setOpen(false);
                  router.push("/admin/groups");
                } catch (err) {
                  toast.error((err as Error).message);
                }
              });
            }}
          >
            <Label htmlFor={inputId}>
              Gõ <span className="font-semibold text-foreground">{groupName}</span> để xác nhận
            </Label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby={`${inputId}-hint`}
            />
            <p id={`${inputId}-hint`} className="text-caption text-muted-foreground" aria-live="polite">
              {typed && !matches ? "Chưa khớp tên sổ." : "Phân biệt dấu, không phân biệt khoảng trắng hai đầu."}
            </p>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Thôi, giữ lại
            </Button>
            <Button
              type="submit"
              form={`${inputId}-form`}
              variant="destructive"
              disabled={!matches}
              loading={pending}
            >
              {pending ? "Đang xoá…" : "Xoá vĩnh viễn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Nút mời một người ra khỏi sổ, đặt ở hàng của họ trong danh sách thành viên. */
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
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Mời ${name} ra khỏi sổ`}>
        <UserMinus aria-hidden />
        Mời ra
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Mời ${name} ra khỏi sổ?`}
        description={`${name} sẽ không xem hay ghi được gì trong sổ “${groupName}” nữa. Những khoản họ đã ghi VẪN Ở LẠI trong sổ, và phần họ phải chịu trong các khoản đã tiêu cũng giữ nguyên. Họ xin vào lại được sau này.`}
        confirmLabel="Mời người này ra"
        pendingLabel="Đang gỡ…"
        cancelLabel="Thôi"
        successMessage={`Đã mời ${name} ra khỏi sổ`}
        onConfirm={() => call(adminRemoveMember(groupId, userId))}
      />
    </>
  );
}
