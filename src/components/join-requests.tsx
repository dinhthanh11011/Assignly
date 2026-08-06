"use client";
import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/member-avatar";
import { approveJoinRequest, rejectJoinRequest } from "@/lib/actions";

type U = { id: string; name?: string | null; image?: string | null; email?: string | null };

export function JoinRequests({
  requests,
}: {
  requests: { id: string; user: U }[];
}) {
  const [pending, start] = useTransition();

  if (requests.length === 0) {
    return (
      <p className="text-body text-muted-foreground">Không có yêu cầu nào đang chờ.</p>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="flex items-center gap-3">
          <MemberAvatar user={r.user} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-body font-medium">{r.user.name || r.user.email}</div>
            {r.user.name && r.user.email && (
              <div className="truncate text-caption text-muted-foreground">{r.user.email}</div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Duyệt"
            className="text-[var(--color-success)]"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await approveJoinRequest(r.id);
                  toast.success(`Đã thêm ${r.user.name || r.user.email}`);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              })
            }
          >
            <Check className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Từ chối"
            className="text-destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await rejectJoinRequest(r.id);
                  toast.success("Đã từ chối yêu cầu");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              })
            }
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
