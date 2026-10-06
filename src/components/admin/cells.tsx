import { Lock, ShieldCheck } from "lucide-react";
import { MemberAvatar } from "@/components/member-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { displayName } from "@/lib/admin-copy";
import { transactionAmountText } from "@/lib/copy";
import { Amount } from "@/components/ui/amount";

type U = { id: string; name: string | null; email: string | null; image?: string | null };

/** Ô người dùng: avatar · tên · email (dòng phụ). */
export function UserCell({ user, size = "md" }: { user: U; size?: "sm" | "md" }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <MemberAvatar user={user} className={size === "md" ? "size-9" : "size-7"} />
      <span className="min-w-0">
        <span className="block truncate">{displayName(user)}</span>
        {user.name && user.email && (
          <span className="block truncate text-caption font-normal text-muted-foreground">{user.email}</span>
        )}
      </span>
    </span>
  );
}

/** Badge trạng thái tài khoản — luôn có chữ + icon, không chỉ màu. */
export function AccountBadges({
  user,
  className,
}: {
  user: { disabledAt: Date | null; isAdmin: boolean };
  className?: string;
}) {
  if (!user.disabledAt && !user.isAdmin) {
    return <Badge variant="muted" className={className}>Đang hoạt động</Badge>;
  }
  return (
    <span className={cn("inline-flex flex-wrap gap-1.5", className)}>
      {user.disabledAt && (
        <Badge variant="destructive">
          <Lock aria-hidden />
          Đã khoá
        </Badge>
      )}
      {user.isAdmin && (
        <Badge variant="accent">
          <ShieldCheck aria-hidden />
          Quản trị
        </Badge>
      )}
    </span>
  );
}

/** Số tiền của một khoản ghi; khoản chưa rõ số tiền KHÔNG được in thành "0 ₫". */
export function TxAmount({
  t,
}: {
  t: { amount: number; amountUnknown: boolean; type: "INCOME" | "EXPENSE" };
}) {
  if (t.amountUnknown) {
    return <span className="text-body text-warning">{transactionAmountText(t)}</span>;
  }
  return <Amount value={t.type === "INCOME" ? t.amount : -t.amount} size="body" />;
}
