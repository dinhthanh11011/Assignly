"use client";
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

type U = { id: string; name?: string | null; image?: string | null; email?: string | null };

/**
 * Một người trong sổ, và ba việc làm được với họ.
 *
 * Bản đầu của màn này xếp ba NÚT ICON TRẦN cuối hàng — vương miện, khiên, hình
 * người có dấu trừ. Không nhãn, không câu giải thích, mà một trong ba là "giao
 * cả cuốn sổ cho người khác", việc không tự lấy lại được. Người dùng không đoán
 * được icon nghĩa là gì thì hoặc không dám bấm, hoặc bấm thử để xem nó làm gì —
 * cả hai đều hỏng. `loan-action-list.tsx` đã học đúng bài này rồi: "không người
 * lớn tuổi nào tìm ra chúng".
 *
 * Nên ở đây theo đúng khuôn của trang chi tiết khoản mượn: cả HÀNG là nút bấm,
 * chạm vào mở sheet mang tên người đó, và ba việc nằm thành HÀNG CÓ NHÃN kèm
 * câu nói rõ hậu quả. Bước xác nhận vẫn giữ nguyên phía sau — sheet chỉ thay
 * phần "đoán xem icon này là gì".
 *
 * Hàng không bấm được (chính mình, người lập sổ, hoặc người xem chỉ là người
 * ghi) thì render thành thẻ tĩnh, không mũi tên — không gợi ra một cú chạm
 * chẳng dẫn tới đâu.
 */
export function MemberRow({
  groupId,
  groupName,
  user,
  role,
  actions,
}: {
  groupId: string;
  groupName: string;
  user: U;
  role: "OWNER" | "ADMIN" | "MEMBER";
  /** Việc người đang xem được phép làm với người này. Rỗng = hàng tĩnh. */
  actions: { role: boolean; transfer: boolean; remove: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<"role" | "transfer" | "remove" | null>(null);

  const name = user.name || user.email || "người trong sổ này";
  const isAdmin = role === "ADMIN";
  const canDoSomething = actions.role || actions.transfer || actions.remove;

  const body = (
    <>
      <MemberAvatar user={user} className="size-10 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-lg">{name}</span>
        <span className="block text-caption text-muted-foreground">{roleLabel(role)}</span>
      </span>
    </>
  );

  if (!canDoSomething) {
    return (
      <div className="flex min-h-14 items-center gap-3 rounded-md px-1 py-1.5">{body}</div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(rowClass(), "rounded-md px-1")}
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
        onConfirm={() => setMemberRole(groupId, user.id, isAdmin ? "MEMBER" : "ADMIN")}
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
        onConfirm={() => transferOwnership(groupId, user.id)}
      />

      <ConfirmDialog
        open={confirming === "remove"}
        onOpenChange={(v) => setConfirming(v ? "remove" : null)}
        title={`Mời ${name} ra khỏi sổ?`}
        description={`${name} sẽ không xem được sổ này nữa. Những khoản ${name} đã ghi vẫn còn nguyên, và bạn có thể mời lại bất cứ lúc nào.`}
        confirmLabel="Mời ra khỏi sổ"
        successMessage={`${name} đã ra khỏi sổ`}
        onConfirm={() => removeMember(groupId, user.id)}
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
