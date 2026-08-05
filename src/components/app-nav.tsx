"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  HandCoins,
  LayoutDashboard,
  Settings,
  Shapes,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.ElementType };

const MAIN: Item[] = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/transactions", label: "Giao dịch", icon: ArrowLeftRight },
  { href: "/loans", label: "Vay nợ", icon: HandCoins },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
];

const MANAGE: Item[] = [
  { href: "/categories", label: "Danh mục", icon: Shapes },
  { href: "/groups", label: "Sổ chung", icon: Users },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

/** Bottom nav để trống ô giữa cho nút "+" nổi (xem FabSlot). */
const MOBILE: (Item | null)[] = [
  MAIN[0],
  MAIN[1],
  null,
  MAIN[2],
  MAIN[3],
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="brand-gradient flex size-9 items-center justify-center rounded-md shadow-soft">
        <Wallet className="size-[18px] text-white" />
      </span>
      <span className="text-[15px] font-bold leading-tight tracking-tight">
        Sổ<span className="text-primary"> Thu Chi</span>
      </span>
    </Link>
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
          "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-sunken hover:text-foreground"
        )}
      >
        {/* Vạch chỉ thị bên trái thay cho việc tô nền cả hàng */}
        <span
          className={cn(
            "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
            active ? "opacity-100" : "opacity-0"
          )}
        />
        <it.icon className={cn("size-[18px]", active && "text-primary")} />
        {it.label}
      </Link>
    );
  };

  return (
    <>
      {/* Thanh bên (màn hình lớn) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-border/70 bg-card/60 backdrop-blur-xl md:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {MAIN.map(link)}
          <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Quản lý
          </p>
          {MANAGE.map(link)}
        </nav>
      </aside>

      {/* Thanh dưới (điện thoại) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="flex items-stretch">
          {MOBILE.map((it) =>
            it === null ? (
              <span key="fab-slot" className="w-16 shrink-0" aria-hidden />
            ) : (
              <Link
                key={it.href}
                href={it.href}
                aria-current={isActive(pathname, it.href) ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
                  isActive(pathname, it.href) ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    isActive(pathname, it.href) && "bg-primary/12"
                  )}
                >
                  <it.icon className="size-[19px]" />
                </span>
                {it.label}
              </Link>
            )
          )}
        </div>
      </nav>
    </>
  );
}
