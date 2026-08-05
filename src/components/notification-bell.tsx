"use client";
import { Bell, Check, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  approveJoinRequest,
  loadNotifications,
  markNotificationRead,
  markNotificationsRead,
  rejectJoinRequest,
} from "@/lib/actions";

type Payload = {
  title?: string;
  body?: string;
  url?: string;
  data?: { requestId?: string; requestStatus?: "PENDING" | "APPROVED" | "REJECTED" | null };
};
type Notification = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: Date;
  readAt: Date | null;
};

/** Absolute or relative stored URL → app-relative path for client navigation. */
function toPath(url?: string): string | null {
  if (!url) return null;
  return url.replace(/^https?:\/\/[^/]+/, "") || "/";
}

export function NotificationBell({
  notifications,
  nextCursor,
  unreadCount,
}: {
  notifications: Notification[];
  nextCursor: string | null;
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // The first page comes fresh from the server on every render; older pages
  // loaded via "load more" are kept locally and merged in (deduped by id).
  const [older, setOlder] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [loading, start] = useTransition();

  // Notifications the user has marked seen this session (optimistic), and
  // join requests resolved via the quick actions.
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [resolved, setResolved] = useState<Record<string, "approved" | "rejected">>({});

  // Reset optimistic state when the server reports a fresh unread count.
  const [prevUnread, setPrevUnread] = useState(unreadCount);
  if (unreadCount !== prevUnread) {
    setPrevUnread(unreadCount);
    setSeenIds(new Set());
  }
  const count = Math.max(0, unreadCount - seenIds.size);

  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...notifications, ...older].filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [notifications, older]);

  function markSeen(n: Notification) {
    if (n.readAt || seenIds.has(n.id)) return;
    setSeenIds((prev) => new Set(prev).add(n.id));
    start(() => markNotificationRead(n.id));
  }

  function openNotification(n: Notification, path: string | null) {
    markSeen(n);
    setOpen(false);
    if (path) router.push(path);
  }

  function loadMore() {
    if (!cursor) return;
    start(async () => {
      const { items, nextCursor: next } = await loadNotifications(cursor);
      setOlder((prev) => [...prev, ...items]);
      setCursor(next);
    });
  }

  function markAllSeen() {
    if (count === 0) return;
    setSeenIds(new Set(all.map((n) => n.id)));
    start(() => markNotificationsRead());
  }

  function decide(n: Notification, requestId: string, action: "approve" | "reject") {
    start(async () => {
      try {
        if (action === "approve") await approveJoinRequest(requestId);
        else await rejectJoinRequest(requestId);
        setResolved((prev) => ({ ...prev, [n.id]: action === "approve" ? "approved" : "rejected" }));
        markSeen(n);
        toast.success(action === "approve" ? "Đã duyệt yêu cầu" : "Đã từ chối yêu cầu");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Thông báo">
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-1rem)] max-w-sm sm:w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Thông báo</span>
          {count > 0 && (
            <button
              type="button"
              onClick={markAllSeen}
              disabled={loading}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              Đánh dấu đã đọc
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {all.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Bạn đã xem hết thông báo 🎉
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {all.map((n) => {
              const p = (n.payload ?? {}) as Payload;
              const path = toPath(p.url);
              const unread = !n.readAt && !seenIds.has(n.id);
              const requestId =
                n.type === "JOIN_REQUEST" ? p.data?.requestId ?? null : null;
              // The owner may have decided this request already (in another
              // session or before reload). Prefer the optimistic local state,
              // then fall back to the status the server folded into the payload.
              const decision =
                resolved[n.id] ??
                (p.data?.requestStatus === "APPROVED"
                  ? "approved"
                  : p.data?.requestStatus === "REJECTED"
                    ? "rejected"
                    : undefined);

              return (
                <div
                  key={n.id}
                  onClick={() => openNotification(n, path)}
                  className={cn(
                    "cursor-pointer rounded-md px-2 py-2 transition-colors hover:bg-muted",
                    unread && "bg-primary/5"
                  )}
                >
                  <div className="flex gap-2">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        unread ? "bg-primary" : "bg-transparent"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.body}</div>

                      {requestId && (
                        <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {decision ? (
                            <span className="text-xs font-medium text-muted-foreground">
                              {decision === "approved" ? "Đã duyệt ✓" : "Đã từ chối"}
                            </span>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 px-2 text-xs"
                                disabled={loading}
                                onClick={() => decide(n, requestId, "approve")}
                              >
                                <Check className="size-3.5" /> Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-destructive"
                                disabled={loading}
                                onClick={() => decide(n, requestId, "reject")}
                              >
                                <X className="size-3.5" /> Từ chối
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {cursor && (
              <div className="p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  disabled={loading}
                  onClick={loadMore}
                >
                  {loading ? "Đang tải…" : "Xem thông báo cũ hơn"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
