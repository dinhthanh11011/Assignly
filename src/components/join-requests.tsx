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
      <p className="text-sm text-muted-foreground">No pending requests.</p>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="flex items-center gap-3">
          <MemberAvatar user={r.user} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{r.user.name || r.user.email}</div>
            {r.user.name && r.user.email && (
              <div className="truncate text-xs text-muted-foreground">{r.user.email}</div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Approve"
            className="text-[var(--color-success)]"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await approveJoinRequest(r.id);
                  toast.success(`${r.user.name || r.user.email} added`);
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
            aria-label="Reject"
            className="text-destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await rejectJoinRequest(r.id);
                  toast.success("Request declined");
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
