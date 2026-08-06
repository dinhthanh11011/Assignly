"use client";
import { useEffect, useSyncExternalStore, useTransition } from "react";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Một chỗ duy nhất theo dõi "app đang đi đâu đó": bấm link trên thanh điều
 * hướng, đổi bộ lọc, đổi tháng, đổi sổ. Trang nào cũng là trang động (dữ liệu
 * riêng từng người) nên mỗi lần chuyển đều phải hỏi server — không có phản hồi
 * gì trong lúc đó là lúc app bị cảm thấy "đơ".
 *
 * Dùng store ngoài React thay vì context vì tín hiệu đến từ nhiều nơi rời rạc
 * (mỗi `<Link>` có `useLinkStatus` riêng, mỗi bộ lọc có transition riêng) nhưng
 * chỉ có **một** thanh tiến trình ở trên cùng lắng nghe.
 */
let pendingCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const isPending = () => pendingCount > 0;
// Server render luôn coi như không có điều hướng nào đang chạy.
const isPendingOnServer = () => false;

function startNav() {
  pendingCount += 1;
  emit();
}

function endNav() {
  pendingCount = Math.max(0, pendingCount - 1);
  emit();
}

/** Báo cho thanh tiến trình biết `pending` của mình, tự gỡ khi unmount. */
function useReportPending(pending: boolean) {
  useEffect(() => {
    if (!pending) return;
    startNav();
    return endNav;
  }, [pending]);
}

/**
 * `useTransition` nhưng có báo về thanh tiến trình. Dùng cho mọi thao tác đổi
 * URL bằng `router.push/replace` (bộ lọc, chọn tháng, đổi sổ).
 */
export function useNavTransition() {
  const [pending, startTransition] = useTransition();
  useReportPending(pending);
  return [pending, startTransition] as const;
}

/**
 * Trạng thái chờ của `<Link>` bao ngoài, đồng thời báo lên thanh tiến trình.
 * Chỉ gọi được từ component nằm **bên trong** một `<Link>`.
 */
export function useNavLinkPending() {
  const { pending } = useLinkStatus();
  useReportPending(pending);
  return pending;
}

/** Bản không vẽ gì của `useNavLinkPending` — chỉ để đẩy tín hiệu lên thanh trên. */
export function LinkPending() {
  useNavLinkPending();
  return null;
}

/**
 * Chấm nhỏ nhấp nháy ngay trong mục điều hướng vừa bấm — cho biết "đã nhận,
 * đang tải" kể cả khi thanh trên cùng bị che. Luôn chiếm sẵn chỗ để không đẩy
 * layout khi hiện ra.
 */
export function NavItemPending({ className }: { className?: string }) {
  const pending = useNavLinkPending();
  return (
    <span
      aria-hidden
      className={cn("nav-dot", pending && "is-pending", className)}
    />
  );
}

/**
 * Thanh mảnh chạy ngang trên cùng màn hình khi có điều hướng đang chờ server.
 * Cố ý trễ 150ms mới hiện: chuyển trang nhanh thì không nháy loạn lên.
 */
export function RouteProgress() {
  const pending = useSyncExternalStore(subscribe, isPending, isPendingOnServer);

  return (
    <div
      aria-hidden
      // top: dưới vùng an toàn — dán top-0 thì vạch 2px nằm trọn dưới thanh
      // trạng thái và không ai thấy phản hồi nào khi bấm chuyển trang.
      className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[60] h-0.5 overflow-hidden"
    >
      <div className={cn("route-progress", pending && "is-pending")} />
    </div>
  );
}

/**
 * Trạng thái chờ dùng chung cho vùng nội dung: mờ đi + không bấm được trong lúc
 * dữ liệu mới đang về, thay vì để người dùng bấm tiếp vào số liệu đã cũ.
 */
export function PendingArea({
  pending,
  className,
  children,
}: {
  pending: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "transition-opacity duration-200",
        pending && "pointer-events-none opacity-60",
        className
      )}
    >
      {children}
    </div>
  );
}
