"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  HeartPulse,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import { NavItemPending } from "@/components/nav-progress";
import { cn, initials } from "@/lib/utils";

/**
 * Điều hướng của khu quản trị — một khung RIÊNG, nhìn là biết không phải app sổ.
 *
 * Thanh bên luôn mang bảng màu tối (class `dark` trên chính nó: mọi token đổi
 * theo cây con, nên vẫn chỉ dùng token và vẫn qua check:contrast). Từ `lg` trở
 * lên là thanh bên dính; dưới `lg` là thanh trên tối + hàng tab bốn mục.
 */

type Item = { href: string; label: string; short: string; icon: React.ElementType };

const NAV: Item[] = [
  { href: "/admin", label: "Tổng quan", short: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/users", label: "Người dùng", short: "Người dùng", icon: Users },
  { href: "/admin/groups", label: "Sổ", short: "Sổ", icon: BookOpen },
  { href: "/admin/health", label: "Tình trạng hệ thống", short: "Hệ thống", icon: HeartPulse },
];

function isActive(pathname: string, href: string) {
  // "/admin" là tiền tố của mọi mục khác → phải khớp chính xác.
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

function ConsoleMark() {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <ShieldCheck className="size-5" aria-hidden />
    </span>
  );
}

export function AdminNav({ user }: { user: { name: string | null; email: string | null } }) {
  const pathname = usePathname();

  return (
    <>
      {/* ── Thanh bên (lg+) ── self-start + h-dvh: dính khi bảng dài cuộn. */}
      <aside className="dark sticky top-0 hidden h-dvh w-64 shrink-0 flex-col self-start border-r border-border bg-card text-foreground lg:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <ConsoleMark />
          <div className="min-w-0">
            <p className="text-body-lg leading-tight">Quản trị</p>
            <p className="truncate text-caption text-muted-foreground">Sổ Thu Chi · toàn hệ thống</p>
          </div>
        </div>

        <nav aria-label="Quản trị" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
          {NAV.map((it) => {
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
                    : "text-muted-foreground hover:bg-sunken hover:text-foreground",
                )}
              >
                <it.icon className="size-5 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{it.label}</span>
                <NavItemPending className="ml-auto" />
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sunken text-label text-foreground"
            >
              {initials(user.name, user.email)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-label">{user.name ?? "Quản trị viên"}</p>
              {user.email && (
                <p className="truncate text-caption text-muted-foreground">{user.email}</p>
              )}
            </div>
          </div>
          <Link
            href="/"
            className="focus-ring flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-body font-medium text-foreground transition-colors duration-150 hover:bg-sunken"
          >
            <ArrowLeft className="size-5 shrink-0" aria-hidden />
            Về app
          </Link>
        </div>
      </aside>

      {/* ── Dưới lg: thanh trên tối + tab ── */}
      <header className="lg:hidden">
        <div className="dark flex items-center gap-3 bg-card px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-foreground">
          <ConsoleMark />
          <p className="min-w-0 flex-1 truncate text-body-lg">Quản trị</p>
          <Link
            href="/"
            className="focus-ring flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-body font-medium transition-colors duration-150 hover:bg-sunken"
          >
            <ArrowLeft className="size-5 shrink-0" aria-hidden />
            Về app
          </Link>
        </div>
        <nav
          aria-label="Quản trị"
          // Bốn tab chia đều; ở cỡ chữ lớn mà chật thì cuộn ngang trong chính hàng tab.
          className="flex overflow-x-auto border-b border-border bg-card px-2"
        >
          {NAV.map((it) => {
            const active = isActive(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring-inset relative flex min-h-14 min-w-[5.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-2 text-caption whitespace-nowrap transition-colors duration-150",
                  active ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <it.icon className="size-5 shrink-0" aria-hidden />
                {it.short}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 bottom-0 h-0.5 rounded-full",
                    active ? "bg-primary" : "bg-transparent",
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
