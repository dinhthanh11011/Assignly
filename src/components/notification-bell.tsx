"use client";
import { call } from "@/lib/action-result";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Crown,
  HandCoins,
  NotebookPen,
  Scale,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
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

/** URL lưu tuyệt đối hoặc tương đối → đường dẫn trong app để điều hướng phía client. */
function toPath(url?: string): string | null {
  if (!url) return null;
  return url.replace(/^https?:\/\/[^/]+/, "") || "/";
}

/** Icon + tông cho từng loại thông báo (loại lạ rơi về chuông). */
const KIND: Record<string, { icon: React.ElementType; tone: string }> = {
  JOIN_REQUEST: { icon: UserPlus, tone: "bg-primary-surface text-primary" },
  JOIN_APPROVED: { icon: UserCheck, tone: "bg-income-surface text-income" },
  JOIN_REJECTED: { icon: UserX, tone: "bg-expense-surface text-expense" },
  LEDGER: { icon: HandCoins, tone: "bg-warning-surface text-warning" },
  SETTLEMENT: { icon: Scale, tone: "bg-income-surface text-income" },
  ROLE_GRANTED: { icon: ShieldCheck, tone: "bg-primary-surface text-primary" },
  ROLE_REVOKED: { icon: ShieldCheck, tone: "bg-sunken text-muted-foreground" },
  OWNER_TRANSFERRED: { icon: Crown, tone: "bg-primary-surface text-primary" },
  ADMIN_GRANTED: { icon: ShieldCheck, tone: "bg-primary-surface text-primary" },
};

const timeFmt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "Vừa xong" · "12 phút trước" · "14:05" (hôm nay) · "Hôm qua" · "03/10". */
function when(d: Date, today: number) {
  const t = new Date(d).getTime();
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  if (t >= today) return timeFmt.format(t);
  if (t >= today - 86_400_000) return "Hôm qua";
  return dateFmt.format(t);
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

  // Trang đầu đến mới từ server mỗi lần render; trang cũ hơn ("xem thêm") giữ
  // ở client rồi gộp vào (khử trùng theo id).
  const [older, setOlder] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [loading, start] = useTransition();

  // Đã đọc trong phiên này (lạc quan), và yêu cầu vào sổ đã xử lý tại chỗ.
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [resolved, setResolved] = useState<Record<string, "approved" | "rejected">>({});

  // Server báo số chưa đọc mới → bỏ trạng thái lạc quan.
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

  // Tính "hôm nay" lúc mở menu (không lúc render) — giữ render thuần.
  const [today, setToday] = useState(0);
  const groups = useMemo(() => {
    const t = today || Number.POSITIVE_INFINITY;
    return [
      { key: "today", label: "Hôm nay", items: all.filter((n) => new Date(n.createdAt).getTime() >= t) },
      { key: "earlier", label: "Trước đó", items: all.filter((n) => new Date(n.createdAt).getTime() < t) },
    ].filter((g) => g.items.length > 0);
  }, [all, today]);

  function markSeen(n: Notification) {
    if (n.readAt || seenIds.has(n.id)) return;
    setSeenIds((prev) => new Set(prev).add(n.id));
    start(() => call(markNotificationRead(n.id)));
  }

  function openNotification(n: Notification, path: string | null) {
    markSeen(n);
    setOpen(false);
    if (path) router.push(path);
  }

  function loadMore() {
    if (!cursor) return;
    start(async () => {
      const { items, nextCursor: next } = await call(loadNotifications(cursor));
      setOlder((prev) => [...prev, ...items]);
      setCursor(next);
    });
  }

  function markAllSeen() {
    if (count === 0) return;
    setSeenIds(new Set(all.map((n) => n.id)));
    start(() => call(markNotificationsRead()));
  }

  function decide(n: Notification, requestId: string, action: "approve" | "reject") {
    start(async () => {
      try {
        if (action === "approve") await call(approveJoinRequest(requestId));
        else await call(rejectJoinRequest(requestId));
        setResolved((prev) => ({ ...prev, [n.id]: action === "approve" ? "approved" : "rejected" }));
        markSeen(n);
        toast.success(action === "approve" ? "Đã duyệt yêu cầu" : "Đã từ chối yêu cầu");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(v) => {
        if (v) setToday(startOfToday());
        setOpen(v);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={count > 0 ? `Thông báo, ${count} chưa đọc` : "Thông báo"}
        >
          <Bell className="size-5" />
          {count > 0 && (
            <span
              aria-hidden
              className="num absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-expense px-1 text-caption font-bold leading-none text-expense-foreground ring-2 ring-background"
            >
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-1.5rem)] max-w-sm p-0 sm:w-96">
        <div className="flex min-h-14 items-center justify-between gap-2 border-b border-border py-1.5 pl-4 pr-1.5">
          <p className="text-body-lg font-semibold">
            Thông báo
            {count > 0 && <span className="font-normal text-muted-foreground"> · {count} mới</span>}
          </p>
          {count > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllSeen} disabled={loading} className="text-primary">
              <CheckCheck /> Đã đọc hết
            </Button>
          )}
        </div>

        {all.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-sunken text-muted-foreground">
              <BellOff className="size-6" />
            </span>
            <p className="mt-3 text-body-lg">Chưa có thông báo nào</p>
            <p className="mt-1 text-caption text-muted-foreground">
              Khi có người xin vào sổ, ghi khoản mượn hay trả tiền, bạn sẽ thấy ở đây.
            </p>
          </div>
        ) : (
          <div className="max-h-[min(28rem,70dvh)] overflow-y-auto p-1.5">
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <p className="px-2.5 pb-1 pt-2 text-caption text-muted-foreground">{g.label}</p>
                <ul>
                  {g.items.map((n) => {
                    const p = (n.payload ?? {}) as Payload;
                    const path = toPath(p.url);
                    const unread = !n.readAt && !seenIds.has(n.id);
                    const kind = KIND[n.type] ?? { icon: NotebookPen, tone: "bg-sunken text-muted-foreground" };
                    const requestId = n.type === "JOIN_REQUEST" ? (p.data?.requestId ?? null) : null;
                    // Chủ sổ có thể đã quyết ở phiên khác: ưu tiên trạng thái tại
                    // chỗ, rồi tới trạng thái server gộp vào payload.
                    const decision =
                      resolved[n.id] ??
                      (p.data?.requestStatus === "APPROVED"
                        ? "approved"
                        : p.data?.requestStatus === "REJECTED"
                          ? "rejected"
                          : undefined);

                    return (
                      <li
                        key={n.id}
                        className={cn("rounded-lg transition-colors duration-150", unread && "bg-primary-surface/50")}
                      >
                        <button
                          type="button"
                          onClick={() => openNotification(n, path)}
                          className="focus-ring-inset flex w-full cursor-pointer gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-sunken"
                        >
                          <span
                            aria-hidden
                            className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", kind.tone)}
                          >
                            <kind.icon className="size-4.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block text-body", unread ? "font-semibold" : "text-muted-foreground")}>
                              {unread && <span className="sr-only">Chưa đọc: </span>}
                              {p.title}
                            </span>
                            {p.body && <span className="block text-caption text-muted-foreground">{p.body}</span>}
                            <span className="mt-0.5 block text-caption text-muted-foreground">
                              {when(n.createdAt, today)}
                            </span>
                          </span>
                          {unread && <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />}
                        </button>

                        {requestId && (
                          <div className="flex flex-wrap gap-2 pb-2.5 pl-14 pr-2.5">
                            {decision ? (
                              <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                                {decision === "approved" ? (
                                  <>
                                    <Check className="size-4 text-income" aria-hidden /> Đã duyệt
                                  </>
                                ) : (
                                  <>
                                    <X className="size-4" aria-hidden /> Đã từ chối
                                  </>
                                )}
                              </span>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="income"
                                  disabled={loading}
                                  onClick={() => decide(n, requestId, "approve")}
                                >
                                  <Check /> Duyệt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  disabled={loading}
                                  onClick={() => decide(n, requestId, "reject")}
                                >
                                  <X /> Từ chối
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {cursor && (
              <div className="p-1">
                <Button variant="ghost" size="sm" className="w-full" loading={loading} onClick={loadMore}>
                  Xem thông báo cũ hơn
                </Button>
              </div>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
