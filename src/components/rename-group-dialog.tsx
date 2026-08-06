"use client";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
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
import { renameGroup } from "@/lib/actions";

/**
 * Đổi tên sổ.
 *
 * Server action `renameGroup` đã có từ trước nhưng KHÔNG có màn hình nào gọi
 * tới — tức là tính năng tồn tại trong code mà người dùng không với tới được.
 * Đây là chỗ đưa nó ra ngoài.
 */
export function RenameGroupDialog({ groupId, name }: { groupId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setValue(name);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil /> Đổi tên
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi tên sổ</DialogTitle>
          <DialogDescription>
            Tên này hiện cho mọi người trong sổ. Đổi tên không ảnh hưởng gì tới các khoản đã ghi.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="group-name">Tên sổ</Label>
          <Input
            id="group-name"
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            placeholder="VD: Chi tiêu gia đình"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Thôi
          </Button>
          <Button
            disabled={pending || !value.trim()}
            aria-busy={pending}
            onClick={() =>
              start(async () => {
                try {
                  await renameGroup(groupId, value.trim());
                  toast.success("Đã đổi tên sổ");
                  setOpen(false);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              })
            }
          >
            {pending ? "Đang lưu…" : "Lưu tên mới"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
