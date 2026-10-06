"use client";
import { call } from "@/lib/action-result";
import { useState } from "react";
import { ChevronRight, Crown, ShieldCheck, ShieldMinus, UserMinus } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MemberAvatar } from "@/components/member-avatar";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RowIcon, rowClass } from "@/components/ui/row";
import { removeMember, setMemberRole, transferOwnership } from "@/lib/actions";
import { roleLabel } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { RoleBadge } from "@/components/groups/role-badge";

type U = { id: string; name?: string | null; image?: string | null; email?: string | null };

/**
 * Một người trong sổ, và các việc làm được với họ.
 *
 * Cả HÀNG là nút: chạm mở sheet mang tên người đó, trong đó mỗi việc là một
 * hàng có nhãn + câu nói rõ hậu quả (không có nút icon trần nào phải đoán).
 * Bước xác nhận vẫn nằm phía sau. Hàng không có việc gì để làm thì là hàng
 * tĩnh, không mũi tên.
 */
export function MemberRow({
  groupId,
  groupName,
  user,
  role,
  actions,
  isMe = false,
}: {
  groupId: string;
  groupName: string;
  user: U;
  role: "OWNER" | "ADMIN" | "MEMBER";
  /** Việc người đang xem được phép làm với người này. Rỗng = hàng tĩnh. */
  actions: { role: boolean; transfer: boolean; remove: boolean };
  /** Hàng của chính người đang xem — gắn chữ "Bạn". */
  isMe?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<"role" | "transfer" | "remove" | null>(null);

  const name = user.name || user.email || "người trong sổ này";
  const isAdmin = role === "ADMIN";
  const canDoSomething = actions.role || actions.transfer || actions.remove;

  const body = (
    <>
      <MemberAvatar user={user} className="size-10 shrink-0" />
      <span className="min-w-0 flex-[1_1_8rem]">
        <span className="block truncate text-body-lg">
          {name}
          {isMe && <span className="text-muted-foreground"> · Bạn</span>}
        </span>
        {user.email && user.name && (
          <span className="block truncate text-caption text-muted-foreground">{user.email}</span>
        )}
      </span>
      <RoleBadge role={role} size="sm" />
    </>
  );

  if (!canDoSomething) {
    return (
      <div className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">{body}</div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(rowClass(), "flex-wrap gap-x-3 gap-y-1.5")}
        aria-label={`Việc làm được với ${name}`}
      >
        {body}
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>
              Đang là {roleLabel(role)} trong sổ “{groupName}”.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {actions.role && (
                <ActionRow
                  icon={isAdmin ? ShieldMinus : ShieldCheck}
                  label={isAdmin ? "Gỡ quyền quản lý" : "Cho làm người quản lý"}
                  hint={
                    isAdmin
                      ? "Vẫn ghi chép bình thường, chỉ thôi duyệt người và đổi tên sổ"
                      : "Duyệt được người xin vào, đổi được tên sổ, mời được người khác ra"
                  }
                  onClick={() => {
                    setOpen(false);
                    setConfirming("role");
                  }}
                />
              )}
              {actions.transfer && (
                <ActionRow
                  icon={Crown}
                  label="Giao sổ cho người này"
                  hint="Họ thành người lập sổ, bạn lùi xuống người quản lý"
                  onClick={() => {
                    setOpen(false);
                    setConfirming("transfer");
                  }}
                />
              )}
              {actions.remove && (
                <ActionRow
                  icon={UserMinus}
                  label="Mời ra khỏi sổ"
                  hint="Họ không xem được sổ này nữa, khoản đã ghi vẫn còn"
                  tone="destructive"
                  onClick={() => {
                    setOpen(false);
                    setConfirming("remove");
                  }}
                />
              )}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Ba bước xác nhận. Mở sau khi sheet đã đóng — hai lớp dialog chồng nhau
          thì lớp dưới giữ mất tiêu điểm của lớp trên. */}
      <ConfirmDialog
        open={confirming === "role"}
        onOpenChange={(v) => setConfirming(v ? "role" : null)}
        title={isAdmin ? `Gỡ quyền quản lý của ${name}?` : `Cho ${name} làm người quản lý?`}
        description={
          isAdmin
            ? `${name} vẫn ghi chép và xem sổ bình thường, chỉ không còn duyệt người xin vào, đổi tên sổ hay mời người khác ra được nữa. Bạn phong lại lúc nào cũng được.`
            : `${name} sẽ đổi được tên sổ, duyệt người xin vào và mời người khác ra khỏi sổ. Họ vẫn không xoá được sổ — chỉ người lập sổ mới xoá được. Bạn gỡ quyền lại lúc nào cũng được.`
        }
        confirmLabel={isAdmin ? "Gỡ quyền quản lý" : "Cho làm người quản lý"}
        // Không phải việc xoá, và gỡ lại được ngay — cả ba mặc định của
        // ConfirmDialog đều mang hình dạng một cú xoá nên phải đổi hết.
        confirmVariant="default"
        pendingLabel="Đang đổi quyền…"
        cancelLabel="Thôi, để nguyên"
        successMessage={isAdmin ? `${name} thôi làm người quản lý` : `${name} giờ là người quản lý`}
        onConfirm={() => call(setMemberRole(groupId, user.id, isAdmin ? "MEMBER" : "ADMIN"))}
      />

      <ConfirmDialog
        open={confirming === "transfer"}
        onOpenChange={(v) => setConfirming(v ? "transfer" : null)}
        title={`Giao sổ “${groupName}” cho ${name}?`}
        description={`${name} sẽ thành người lập sổ: họ xoá được sổ này và đổi được quyền của mọi người, kể cả bạn. Bạn lùi xuống làm người quản lý — vẫn ghi chép và quản lý người trong sổ, nhưng không lấy lại quyền lập sổ được, trừ khi ${name} giao lại cho bạn.`}
        // Nút ĐỎ ở đây là đúng, khác hàng đổi quyền bên trên: đây là mất quyền
        // kiểm soát và không tự lấy lại được.
        confirmLabel="Giao sổ cho họ"
        pendingLabel="Đang giao sổ…"
        cancelLabel="Thôi, tôi giữ"
        successMessage={`${name} giờ là người lập sổ`}
        onConfirm={() => call(transferOwnership(groupId, user.id))}
      />

      <ConfirmDialog
        open={confirming === "remove"}
        onOpenChange={(v) => setConfirming(v ? "remove" : null)}
        title={`Mời ${name} ra khỏi sổ?`}
        description={`${name} sẽ không xem được sổ này nữa. Những khoản ${name} đã ghi vẫn còn nguyên, và bạn có thể mời lại bất cứ lúc nào.`}
        confirmLabel="Mời ra khỏi sổ"
        successMessage={`${name} đã ra khỏi sổ`}
        onConfirm={() => call(removeMember(groupId, user.id))}
      />
    </>
  );
}

function ActionRow({
  icon: Icon,
  label,
  hint,
  tone = "normal",
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  hint: string;
  tone?: "normal" | "destructive";
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={rowClass()}>
      <RowIcon icon={Icon} tone={tone === "destructive" ? "expense" : "primary"} />
      <span className="min-w-0 flex-1">
        <span
          className={cn("block truncate text-body-lg", tone === "destructive" && "text-destructive")}
        >
          {label}
        </span>
        <span className="block text-caption text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
