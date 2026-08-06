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

export function AvatarStack({ users, max = 5 }: { users: U[]; max?: number }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((u) => (
        <MemberAvatar key={u.id} user={u} />
      ))}
      {extra > 0 && (
        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-caption font-semibold ring-2 ring-background">
          +{extra}
        </span>
      )}
    </div>
  );
}
