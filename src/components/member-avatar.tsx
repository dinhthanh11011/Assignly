import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

type U = { id: string; name?: string | null; image?: string | null; email?: string | null };

export function MemberAvatar({ user, className }: { user: U; className?: string }) {
  return (
    <Avatar className={cn("size-7", className)}>
      {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
      <AvatarFallback className="text-caption">{initials(user.name, user.email)}</AvatarFallback>
    </Avatar>
  );
}

/**
 * Chồng avatar chồng mép nhau. Vòng `ring-card` tách từng mặt khỏi mặt bên
 * dưới; số dư "+N" nằm trong ô tròn cùng cỡ để cả chồng đọc thành một khối.
 * Cả chồng có một nhãn đọc được — từng ảnh riêng không nói gì với máy đọc.
 */
export function AvatarStack({
  users,
  max = 5,
  total,
  size = "sm",
  className,
}: {
  users: U[];
  max?: number;
  /** Tổng số người thật (khi `users` chỉ là vài người đầu). */
  total?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const shown = users.slice(0, max);
  const count = Math.max(total ?? users.length, users.length);
  const extra = count - shown.length;
  const dim = size === "md" ? "size-9" : "size-7";
  const names = users
    .map((u) => u.name || u.email)
    .filter(Boolean)
    .slice(0, max)
    .join(", ");
  return (
    <div
      role="img"
      aria-label={`${count} người${names ? `: ${names}` : ""}${extra > 0 ? "…" : ""}`}
      className={cn("flex shrink-0 items-center -space-x-2", className)}
    >
      {shown.map((u) => (
        <MemberAvatar key={u.id} user={u} className={dim} />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "relative flex items-center justify-center rounded-full bg-sunken text-caption font-semibold text-muted-foreground ring-2 ring-card",
            dim
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
