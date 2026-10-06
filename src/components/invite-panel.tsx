"use client";
import { call } from "@/lib/action-result";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Check, Copy, Link2, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { rotateInvite } from "@/lib/actions";

const canShareStore = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

/**
 * Mời người khác vào sổ: mã hiện TO (để đọc qua điện thoại), và ba cách gửi có
 * chữ — chia sẻ (bảng chia sẻ của máy, nếu có), sao chép link, sao chép mã.
 */
export function InvitePanel({
  groupId,
  code,
  canManage,
  groupName,
}: {
  groupId: string;
  code: string | null;
  canManage: boolean;
  groupName?: string;
}) {
  const [current, setCurrent] = useState(code);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [rotating, setRotating] = useState(false);
  const [pending, start] = useTransition();
  // navigator.share chỉ biết ở client — render đầu luôn "không có" cho khớp server.
  const canShare = useSyncExternalStore(() => () => {}, canShareStore, () => false);

  const link = () => `${window.location.origin}/join/${current}`;

  async function copy(kind: "code" | "link") {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(kind === "code" ? current : link());
      setCopied(kind);
      toast.success(kind === "code" ? "Đã sao chép mã vào sổ" : "Đã sao chép link mời");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Không sao chép được — hãy chép tay mã ở trên");
    }
  }

  async function share() {
    if (!current) return;
    try {
      await navigator.share({
        title: "Mời vào sổ Sổ Thu Chi",
        text: `Vào sổ “${groupName ?? "của mình"}” trên Sổ Thu Chi — mã ${current}`,
        url: link(),
      });
    } catch (e) {
      // Người dùng đóng bảng chia sẻ thì thôi, không phải lỗi.
      if ((e as Error).name !== "AbortError") copy("link");
    }
  }

  if (!current) {
    return (
      <div className="space-y-3">
        <p className="text-body text-muted-foreground">Sổ này chưa có mã vào sổ.</p>
        {canManage && (
          <Button
            variant="outline"
            loading={pending}
            onClick={() =>
              start(async () => {
                try {
                  const { code } = await call(rotateInvite(groupId));
                  setCurrent(code);
                  toast.success("Đã tạo mã vào sổ");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              })
            }
          >
            <RefreshCw aria-hidden /> Tạo mã vào sổ
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-border-strong bg-sunken px-4 py-5 text-center">
        <p className="text-caption text-muted-foreground">Mã vào sổ</p>
        <p className="num mt-1 text-money-hero break-all text-foreground" aria-label={current.split("").join(" ")}>
          {current}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {canShare && (
          <Button variant="soft" onClick={share} className="sm:col-span-2">
            <Share2 /> Gửi lời mời…
          </Button>
        )}
        <Button variant="outline" onClick={() => copy("link")}>
          {copied === "link" ? <Check className="text-income" /> : <Link2 />}
          Sao chép link mời
        </Button>
        <Button variant="outline" onClick={() => copy("code")}>
          {copied === "code" ? <Check className="text-income" /> : <Copy />}
          Sao chép mã
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
            <RefreshCw /> Đổi mã khác
          </Button>
          {/* Đổi mã là làm hỏng mọi lời mời đã gửi — phải nói trước. */}
          <ConfirmDialog
            open={rotating}
            onOpenChange={setRotating}
            title="Tạo mã vào sổ mới?"
            description="Mã và link cũ sẽ không dùng được nữa. Ai đang giữ mã cũ mà chưa vào sổ thì phải xin mã mới."
            confirmLabel="Tạo mã mới"
            confirmVariant="default"
            pendingLabel="Đang tạo…"
            cancelLabel="Thôi, giữ mã cũ"
            successMessage="Đã tạo mã vào sổ mới"
            onConfirm={async () => {
              const { code } = await call(rotateInvite(groupId));
              start(() => setCurrent(code));
            }}
          />
        </>
      )}
    </div>
  );
}
