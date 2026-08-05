"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, LogIn } from "lucide-react";
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
import { createGroup, requestToJoinByCode } from "@/lib/actions";

export function CreateGroupButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="size-4" /> Tạo sổ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo sổ mới</DialogTitle>
          <DialogDescription>
            Mỗi sổ có danh mục, giao dịch và khoản vay riêng. Sổ mới được tạo sẵn bộ danh mục
            thu chi thông dụng.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              try {
                const { id } = await createGroup(fd);
                toast.success("Đã tạo sổ");
                setOpen(false);
                router.push(`/groups/${id}`);
              } catch (e) {
                toast.error((e as Error).message);
              }
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Tên sổ</Label>
            <Input
              id="name"
              name="name"
              placeholder="VD: Chi tiêu gia đình"
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending ? "Đang tạo…" : "Tạo sổ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JoinGroupButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LogIn className="size-4" /> Tham gia
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tham gia một sổ</DialogTitle>
          <DialogDescription>
            Nhập mã mời được chia sẻ. Quản trị viên của sổ sẽ duyệt trước khi bạn vào.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              try {
                const { status, groupId } = await requestToJoinByCode(String(fd.get("code") ?? ""));
                setOpen(false);
                if (status === "member") {
                  toast.success("Bạn đã ở trong sổ này rồi");
                  router.push(`/groups/${groupId}`);
                } else {
                  toast.success("Đã gửi yêu cầu — chờ quản trị viên duyệt");
                  router.push("/groups");
                }
              } catch (e) {
                toast.error((e as Error).message);
              }
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="code">Mã mời</Label>
            <Input
              id="code"
              name="code"
              placeholder="ABCD2345"
              autoFocus
              required
              className="uppercase tracking-widest"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang gửi…" : "Gửi yêu cầu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
