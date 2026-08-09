"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, useValidation } from "@/components/field";
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

/** Cho phép chỗ gọi đổi dáng nút — trước đây cả bốn thứ này đều đóng cứng. */
type TriggerProps = {
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
  label?: string;
};

export function CreateGroupButton({
  size,
  variant = "gradient",
  className,
  label = "Tạo sổ mới",
  redirectTo,
}: TriggerProps & {
  /**
   * Đi đâu sau khi tạo xong. Không truyền = ở nguyên chỗ cũ và làm mới —
   * đúng cho `/groups` và `/settings`, nơi sổ mới hiện ra ngay trong danh sách
   * người dùng đang nhìn.
   *
   * Màn "chưa có sổ nào" truyền "/" để người mới đi THẲNG tới trang ghi chép.
   * Trước đây mọi lần tạo đều đẩy về `/groups/[id]` — tức là người vừa lập sổ
   * đầu đời bị thả vào màn quản trị thành viên, có mã mời, có danh sách duyệt
   * và một vùng đỏ "Xoá sổ này", mà không câu nào nói bước tiếp theo là ghi
   * một khoản.
   */
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { errors, check, clear } = useValidation<"name">();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Plus /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo sổ mới</DialogTitle>
          <DialogDescription>
            Mỗi sổ có loại, khoản và khoản mượn riêng. Sổ mới được tạo sẵn bộ loại
            thu chi thông dụng.
          </DialogDescription>
        </DialogHeader>
        <form
          // noValidate: không có nó thì tên trống bị bong bóng tiếng Anh của hệ
          // điều hành chặn lại. Mà kể cả lọt qua, `z.string().min(1)` trong
          // createGroup ném ra thông báo zod tiếng Anh thẳng vào toast — chuỗi
          // tiếng Anh duy nhất người dùng tạo ra được trong cả app.
          noValidate
          action={(fd) => {
            const name = String(fd.get("name") ?? "").trim();
            if (
              !check([
                {
                  field: "name",
                  invalid: !name,
                  message: 'Đặt tên cho sổ, ví dụ "Chi tiêu gia đình"',
                },
              ])
            )
              return;
            start(async () => {
              try {
                await createGroup(fd);
                toast.success("Đã tạo sổ — giờ ghi khoản đầu tiên thôi");
                setOpen(false);
                // createGroup đã tự đặt sổ này làm sổ đang mở (writeActiveGroupId)
                // và revalidate "/", nên "/" hiện đúng sổ vừa tạo.
                if (redirectTo) router.push(redirectTo);
                else router.refresh();
              } catch (e) {
                toast.error((e as Error).message);
              }
            });
          }}
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
              onChange={() => clear("name")}
              aria-invalid={Boolean(errors.name) || undefined}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            <FieldError id="name-error">{errors.name}</FieldError>
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={pending} aria-busy={pending}>
              {pending ? "Đang tạo…" : "Tạo sổ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JoinGroupButton({
  size,
  variant = "outline",
  className,
  label = "Vào sổ bằng mã",
}: TriggerProps) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { errors, check, clear } = useValidation<"code">();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <LogIn /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tham gia một sổ</DialogTitle>
          <DialogDescription>
            Nhập mã vào sổ được chia sẻ. Người quản lý của sổ sẽ duyệt trước khi bạn vào.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          action={(fd) => {
            const code = String(fd.get("code") ?? "").trim();
            if (
              !check([
                { field: "code", invalid: !code, message: "Nhập mã vào sổ (8 chữ và số)" },
              ])
            )
              return;
            start(async () => {
              try {
                const { status, groupId } = await requestToJoinByCode(code);
                setOpen(false);
                if (status === "member") {
                  toast.success("Bạn đã ở trong sổ này rồi");
                  router.push(`/groups/${groupId}`);
                } else {
                  toast.success("Đã gửi yêu cầu — chờ người quản lý duyệt");
                  router.push("/groups");
                }
              } catch (e) {
                toast.error((e as Error).message);
              }
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="code">Mã vào sổ</Label>
            <Input
              id="code"
              name="code"
              placeholder="ABCD2345"
              autoFocus
              required
              onChange={() => clear("code")}
              aria-invalid={Boolean(errors.code) || undefined}
              aria-describedby={errors.code ? "code-error" : undefined}
              className="num text-center text-title"
            />
            <FieldError id="code-error">{errors.code}</FieldError>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? "Đang gửi…" : "Gửi yêu cầu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
