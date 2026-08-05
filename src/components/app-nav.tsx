"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  HandCoins,
  LayoutDashboard,
  Scale,
  Settings,
  Shapes,
  Users,
  Wallet,
} from "lucide-react";
import { NavItemPending, useNavLinkPending } from "@/components/nav-progress";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.ElementType };

const MAIN: Item[] = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/transactions", label: "Giao dịch", icon: ArrowLeftRight },
  { href: "/loans", label: "Vay nợ", icon: HandCoins },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
];

const MANAGE: Item[] = [
  { href: "/balance", label: "Cân đối", icon: Scale },
  { href: "/categories", label: "Danh mục", icon: Shapes },
  { href: "/groups", label: "Sổ chung", icon: Users },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

/** Thanh nổi để trống ô giữa cho nút "+" (xem QuickAddButton). */
const MOBILE: (Item | null)[] = [MAIN[0], MAIN[1], null, MAIN[2], MAIN[3]];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="brand-gradient flex size-9 items-center justify-center rounded-lg shadow-soft">
        <Wallet className="size-[18px] text-white" />
      </span>
      <span className="text-[15px] font-bold leading-tight tracking-tight">
        Sổ<span className="text-primary"> Thu Chi</span>
      </span>
    </Link>
  );
}

/**
 * Chấm dưới biểu tượng ở thanh nổi: bình thường chỉ sáng ở mục đang mở, nhưng
 * khi vừa bấm sang mục khác thì chấm của mục đó nhấp nháy — bấm là thấy phản
 * hồi ngay, không phải nhìn màn hình đứng yên chờ server.
 */
function MobileNavDot({ active }: { active: boolean }) {
  const pending = useNavLinkPending();
  return (
    <span
      aria-hidden
      className={cn(
        "size-1 rounded-full bg-primary transition-opacity",
        pending ? "animate-pulse opacity-100" : active ? "opacity-100" : "opacity-0"
      )}
    />
  );
}

export function AppNav() {
  const pathname = usePathname();

  const link = (it: Item) => {
    const active = isActive(pathname, it.href);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150",
          active
            ? "bg-primary/14 text-primary"
            : "text-muted-foreground hover:bg-sunken hover:text-foreground"
        )}
      >
        <it.icon className="size-[18px]" />
        {it.label}
        {/* Trang nào cũng phải hỏi server — chấm này xác nhận cú bấm ngay lập tức. */}
        <NavItemPending className="ml-auto" />
      </Link>
    );
  };

  return (
    <>
      {/* Thanh bên (màn hình lớn) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-hairline bg-card/40 backdrop-blur-2xl md:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {MAIN.map(link)}
          <p className="px-3.5 pb-1.5 pt-6 text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
            Quản lý
          </p>
          {MANAGE.map(link)}
        </nav>
      </aside>

      {/* Thanh nổi (điện thoại): viên thuốc kính, không dính đáy màn hình */}
      <nav
        className="glass glass-edge fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-full p-1.5 shadow-lift md:hidden"
        aria-label="Điều hướng chính"
      >
        {MOBILE.map((it) =>
          it === null ? (
            // Ô trống đúng chỗ nút "+" nổi đè lên
            <span key="fab-slot" className="w-14 shrink-0" aria-hidden />
          ) : (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(pathname, it.href) ? "page" : undefined}
              aria-label={it.label}
              className={cn(
                "flex size-12 flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-150",
                isActive(pathname, it.href)
                  ? "bg-primary/16 text-primary"
                  : "text-muted-foreground active:bg-sunken"
              )}
            >
              <it.icon className="size-[19px]" />
              <MobileNavDot active={isActive(pathname, it.href)} />
            </Link>
          )
        )}
      </nav>
    </>
  );
}
