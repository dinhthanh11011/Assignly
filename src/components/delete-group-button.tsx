"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteGroup } from "@/lib/actions";

export function DeleteGroupButton({
  groupId,
  groupName,
  counts,
}: {
  groupId: string;
  groupName: string;
  counts: { members: number; transactions: number; loans: number; categories: number };
}) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const matches = confirmName.trim() === groupName.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmName("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full sm:w-auto">
          <Trash2 className="size-4" /> Xoá sổ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xoá sổ “{groupName}”?</DialogTitle>
          <DialogDescription>
            Toàn bộ dữ liệu của sổ sẽ bị xoá vĩnh viễn với tất cả thành viên và không thể phục
            hồi.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <ul className="space-y-0.5 text-muted-foreground">
            <li>{counts.transactions} giao dịch</li>
            <li>{counts.loans} khoản vay (kèm lịch sử thu / trả nợ)</li>
            <li>{counts.categories} danh mục</li>
            <li>{counts.members} thành viên sẽ mất quyền truy cập</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-name">
            Nhập <span className="font-semibold text-foreground">{groupName}</span> để xác nhận
          </Label>
          <Input
            id="confirm-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={groupName}
            autoComplete="off"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Huỷ
          </Button>
          <Button
            variant="destructive"
            disabled={!matches || pending}
            onClick={() =>
              start(async () => {
                try {
                  await deleteGroup(groupId);
                  toast.success("Đã xoá sổ");
                  setOpen(false);
                  router.push("/groups");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              })
            }
          >
            {pending ? "Đang xoá…" : "Xoá vĩnh viễn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
