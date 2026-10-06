"use client";
import { call } from "@/lib/action-result";
import { useState, useTransition } from "react";
import { Check, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/member-avatar";
import { approveJoinRequest, rejectJoinRequest } from "@/lib/actions";

type U = { id: string; name?: string | null; image?: string | null; email?: string | null };

/** Người xin vào sổ — hai nút CÓ CHỮ "Duyệt" / "Từ chối" cho từng người. */
export function JoinRequests({ requests }: { requests: { id: string; user: U }[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<{ id: string; action: "approve" | "reject" } | null>(null);

  if (requests.length === 0) {
    return (
      <p className="flex items-center gap-2.5 rounded-lg bg-sunken px-4 py-3.5 text-body text-muted-foreground">
        <Inbox className="size-5 shrink-0" aria-hidden />
        Không có ai đang chờ duyệt.
      </p>
    );
  }

  function decide(id: string, name: string, action: "approve" | "reject") {
    setBusy({ id, action });
    start(async () => {
      try {
        if (action === "approve") {
          await call(approveJoinRequest(id));
          toast.success(`Đã cho ${name} vào sổ`);
        } else {
          await call(rejectJoinRequest(id));
          toast.success(`Đã từ chối ${name}`);
        }
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {requests.map((r) => {
        const name = r.user.name || r.user.email || "Người này";
        const mine = busy?.id === r.id;
        return (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3">
            <MemberAvatar user={r.user} className="size-10" />
            <div className="min-w-0 flex-[1_1_10rem]">
              <p className="truncate text-body-lg">{name}</p>
              {r.user.name && r.user.email && (
                <p className="truncate text-caption text-muted-foreground">{r.user.email}</p>
              )}
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={pending}
                loading={mine && busy?.action === "reject"}
                onClick={() => decide(r.id, name, "reject")}
              >
                {!(mine && busy?.action === "reject") && <X />} Từ chối
              </Button>
              <Button
                variant="income"
                size="sm"
                disabled={pending}
                loading={mine && busy?.action === "approve"}
                onClick={() => decide(r.id, name, "approve")}
              >
                {!(mine && busy?.action === "approve") && <Check />} Duyệt
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
