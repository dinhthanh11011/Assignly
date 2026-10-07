"use client";
import { call } from "@/lib/action-result";
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
          <Trash2 /> Xoá sổ…
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xoá sổ “{groupName}”?</DialogTitle>
          <DialogDescription>
            Toàn bộ dữ liệu của sổ bị xoá vĩnh viễn cho tất cả người trong sổ, không phục hồi được.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-lg bg-expense-surface p-3.5 text-body">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
          <ul className="space-y-0.5 text-foreground">
            <li>{counts.transactions} khoản</li>
            <li>{counts.loans} khoản mượn (kèm lịch sử thu / trả nợ)</li>
            <li>{counts.categories} loại</li>
            <li>{counts.members} người trong sổ sẽ mất quyền truy cập</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-name">
            Gõ đúng tên sổ <span className="font-semibold text-foreground">{groupName}</span> để
            xác nhận
          </Label>
          <Input
            id="confirm-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={groupName}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Huỷ
          </Button>
          <Button
            variant="destructive"
            disabled={!matches}
            loading={pending}
            onClick={() =>
              start(async () => {
                try {
                  await call(deleteGroup(groupId));
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
