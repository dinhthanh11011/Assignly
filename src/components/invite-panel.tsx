"use client";
import { useState, useTransition } from "react";
import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { rotateInvite } from "@/lib/actions";

/**
 * Mời người khác vào sổ.
 *
 * Hai cách chia sẻ là HAI NÚT CÓ CHỮ, không phải hai nút icon cạnh nhau như bản
 * cũ. "Sao chép mã" và "sao chép đường link" làm hai việc khác nhau, nhưng một
 * biểu tượng giấy-chồng-giấy và một biểu tượng chia-sẻ đặt sát nhau thì không
 * ai đoán ra cái nào là cái nào.
 *
 * Mã hiện to, giãn chữ vừa phải, để đọc to lên cho người kia nghe qua điện
 * thoại được — đó mới là cách người ta thật sự dùng nó.
 */
export function InvitePanel({
  groupId,
  code,
  canManage,
}: {
  groupId: string;
  code: string | null;
  canManage: boolean;
}) {
  const [current, setCurrent] = useState(code);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [pending, start] = useTransition();

  function copyCode() {
    if (!current) return;
    navigator.clipboard.writeText(current);
    setCopied(true);
    toast.success("Đã sao chép mã vào sổ");
    setTimeout(() => setCopied(false), 1500);
  }

  function copyLink() {
    if (!current) return;
    navigator.clipboard.writeText(`${window.location.origin}/join/${current}`);
    toast.success("Đã sao chép đường link mời");
  }

  if (!current) {
    return <p className="text-body text-muted-foreground">Sổ này chưa có mã vào sổ.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-body text-muted-foreground">
        Đưa mã này cho người bạn muốn mời. Họ nhập mã, rồi bạn duyệt là xong.
      </p>

      <p className="num rounded-lg border-[1.5px] border-border bg-sunken py-4 text-center text-page">
        {current}
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={copyCode}>
          {copied ? <Check className="text-income" /> : <Copy />}
          Sao chép mã
        </Button>
        <Button variant="outline" onClick={copyLink}>
          <Link2 /> Sao chép đường link
        </Button>
      </div>

      {canManage && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            disabled={pending}
            onClick={() => setRotating(true)}
          >
            <RefreshCw /> Tạo mã mới
          </Button>
          {/* Đổi mã là làm hỏng mọi lời mời đã gửi đi — phải nói ra trước. */}
          <ConfirmDialog
            open={rotating}
            onOpenChange={setRotating}
            title="Tạo mã vào sổ mới?"
            description="Mã cũ sẽ không dùng được nữa. Ai đang giữ mã cũ mà chưa vào sổ thì sẽ phải xin lại mã mới."
            confirmLabel="Tạo mã mới"
            pendingLabel="Đang tạo…"
            cancelLabel="Thôi, giữ mã cũ"
            successMessage="Đã tạo mã vào sổ mới"
            onConfirm={async () => {
              const { code } = await rotateInvite(groupId);
              start(() => setCurrent(code));
            }}
          />
        </>
      )}
    </div>
  );
}
