"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartPie,
  HandCoins,
  LayoutDashboard,
  NotebookPen,
  NotebookText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { NavItemPending, useNavLinkPending } from "@/components/nav-progress";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.ElementType };

/**
 * Bốn đích đến chính (skill: bottom-nav ≤5), mỗi đích một câu hỏi:
 *   Tổng quan — tình hình mình thế nào, có việc gì cần làm
 *   Sổ        — đã ghi những gì (danh sách + lịch + lọc)
 *   Nợ        — ai nợ ai
 *   Báo cáo   — tiêu vào đâu, xu hướng ra sao
 * Cài đặt là chỗ ít ghé: ở đáy thanh bên (desktop) và icon trên thanh trên
 * (điện thoại), để thanh dưới còn chỗ cho nút "Ghi" ở giữa.
 */
const NAV: Item[] = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/ledger", label: "Sổ", icon: NotebookText },
  { href: "/loans", label: "Nợ", icon: HandCoins },
  { href: "/reports", label: "Báo cáo", icon: ChartPie },
];

/** Thanh nổi để trống ô giữa cho nút "Ghi" (xem QuickAddButton). */
const MOBILE: (Item | null)[] = [NAV[0], NAV[1], null, NAV[2], NAV[3]];

export const SETTINGS_ITEM: Item = { href: "/settings", label: "Cài đặt", icon: Settings };
/** Bảng quản trị — chỉ ở thanh bên; trên điện thoại vào qua Cài đặt. */
const ADMIN_ITEM: Item = { href: "/admin", label: "Quản trị", icon: ShieldCheck };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * `compact` chỉ còn biểu tượng: trên điện thoại, chỗ nằm ngang phải nhường cho
 * TÊN SỔ đang mở. Tên app thì người dùng đã biết (họ vừa bấm icon để vào), còn
 * đang ghi vào sổ nào thì chỉ thanh trên trả lời được — nên chữ "Sổ Thu Chi"
 * không được phép bóp bộ chọn sổ xuống còn cái icon.
 */
export function Brand({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Sổ Thu Chi — về Tổng quan"
      className={cn(
        "focus-ring flex min-h-12 items-center gap-2.5 rounded-lg",
        className
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary">
        <NotebookPen className="size-5 text-primary-foreground" aria-hidden />
      </span>
      {!compact && (
        <span className="text-title leading-tight">
          Sổ Thu Chi
        </span>
      )}
    </Link>
  );
}

export function AppNav({
  picker,
  footer,
  isAdmin = false,
}: {
  picker?: React.ReactNode;
  footer?: React.ReactNode;
  /** Quản trị viên toàn hệ thống — quyết định ở server, xem `(app)/layout.tsx`. */
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  const link = (it: Item) => {
    const active = isActive(pathname, it.href);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-body font-medium transition-colors duration-150",
          active
            ? "bg-primary-surface font-semibold text-primary"
            : "text-muted-foreground hover:bg-sunken hover:text-foreground"
        )}
      >
        <it.icon className="size-5 shrink-0" aria-hidden />
        {it.label}
        <NavItemPending className="ml-auto" />
      </Link>
    );
  };

  return (
    <>
      {/* Thanh bên (màn hình lớn) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-border bg-card pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:flex">
        <div className="px-5 pb-4 pt-5">
          <Brand />
        </div>
        {picker && (
          <div className="px-3 pb-4">
            <p className="px-2 pb-1.5 text-caption text-muted-foreground">Sổ đang mở</p>
            {picker}
          </div>
        )}
        <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map(link)}
          <div className="mt-auto flex flex-col gap-0.5 border-t border-border pb-2 pt-2">
            {link(SETTINGS_ITEM)}
            {isAdmin && link(ADMIN_ITEM)}
          </div>
        </nav>
        {footer && <div className="border-t border-border p-3">{footer}</div>}
      </aside>

      {/* Thanh dưới (điện thoại): mỗi mục có CHỮ, mục đang mở có viên nền sau
          icon (kiểu Material 3) — đổi màu thôi là chưa đủ để nói "đang ở đây".
          Lề ngang đối xứng theo vùng an toàn để ô trống ở giữa luôn trùng tâm
          màn hình, nơi nút "Ghi" nổi neo vào. */}
      <nav
        className="surface-float fixed inset-x-[max(0.5rem,env(safe-area-inset-left),env(safe-area-inset-right))] bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-30 flex items-stretch justify-around rounded-2xl px-1 py-1.5 md:hidden"
        aria-label="Điều hướng chính"
      >
        {MOBILE.map((it) => {
          if (it === null) return <span key="fab-slot" className="w-16 shrink-0" aria-hidden />;
          const active = isActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                // min-w-0: nhãn được xuống dòng ở cỡ chữ lớn thay vì đẩy các mục
                // tràn khỏi thanh và đè lên nút "Ghi".
                "focus-ring group flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 transition-colors duration-150",
                active ? "text-primary" : "text-muted-foreground active:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200",
                  active ? "bg-primary-surface" : "group-hover:bg-sunken"
                )}
              >
                <it.icon className="size-5 shrink-0" aria-hidden />
              </span>
              <span className={cn("w-full text-center text-caption leading-tight", active && "font-semibold")}>
                {it.label}
              </span>
              <MobilePending />
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** Vừa bấm sang mục này: một vạch nhỏ nhấp nháy xác nhận cú bấm ngay, trong
 *  lúc chờ server. Luôn chiếm chỗ để thanh không nhảy. */
function MobilePending() {
  const pending = useNavLinkPending();
  return (
    <span
      aria-hidden
      className={cn("-mt-0.5 h-0.5 w-4 rounded-full bg-primary", pending ? "animate-pulse" : "invisible")}
    />
  );
}
