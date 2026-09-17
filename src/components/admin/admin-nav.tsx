"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, BookOpen, HeartPulse, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Điều hướng của khu quản trị.
 *
 * `app-nav.tsx` khoá cứng ở BỐN đích đến và nói rõ là không hơn — nhưng giới hạn
 * đó là của mảng `NAV` trong file ấy: nó bảo vệ thanh nổi dưới cùng trên điện
 * thoại, nơi thêm mục thứ năm sẽ bóp nhãn vỡ ở cỡ chữ lớn. Khu này là một khung
 * riêng, desktop-first, không có thanh nổi ấy. Hai thứ không đụng nhau.
 */

type Item = { href: string; label: string; icon: React.ElementType };

const NAV: Item[] = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/groups", label: "Sổ", icon: BookOpen },
  { href: "/admin/health", label: "Tình trạng hệ thống", icon: HeartPulse },
];

function isActive(pathname: string, href: string) {
  // "/admin" là tiền tố của mọi mục khác, nên nó phải khớp CHÍNH XÁC — không thì
  // "Tổng quan" sáng lên ở cả bốn trang.
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar — bố cục chính, từ md trở lên. */}
      <nav
        aria-label="Quản trị"
        // sticky + self-start + h-dvh: bảng ở /admin dài hàng nghìn pixel, mà
        // thanh bên mặc định bị kéo cao bằng cả trang rồi cuộn mất tăm — muốn
        // đổi mục phải cuộn ngược lên đầu. self-start là phần bắt buộc: không
        // có nó, align-items:stretch kéo thanh bên cao bằng container và sticky
        // thành vô nghĩa (không còn chỗ nào để dính).
        className="hidden w-64 shrink-0 flex-col gap-1 border-r border-border bg-card p-3 md:sticky md:top-0 md:flex md:h-dvh md:self-start md:overflow-y-auto"
      >
        <div className="px-3 py-3">
          <div className="text-title">Quản trị</div>
          <p className="mt-1 text-caption text-muted-foreground">Toàn bộ app, không riêng sổ nào</p>
        </div>
        {NAV.map((it) => (
          <AdminNavLink key={it.href} item={it} active={isActive(pathname, it.href)} />
        ))}
        {/* Đường kẻ chứ không chỉ một khoảng trống: "Về app" đi RA KHỎI khu
            quản trị, không phải mục thứ năm của nó. */}
        <div className="mt-auto border-t border-border pt-2">
          <AdminNavLink item={{ href: "/", label: "Về app", icon: ArrowLeft }} active={false} />
        </div>
      </nav>

      {/* Dưới md: thanh ngang cuộn được. Khu này desktop-first, nhưng mở trên
          điện thoại thì phải dùng được chứ không được vỡ. */}
      <nav
        aria-label="Quản trị"
        className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden"
      >
        {NAV.map((it) => (
          <AdminNavLink key={it.href} item={it} active={isActive(pathname, it.href)} compact />
        ))}
        <AdminNavLink item={{ href: "/", label: "Về app", icon: ArrowLeft }} active={false} compact />
      </nav>
    </>
  );
}

function AdminNavLink({
  item,
  active,
  compact = false,
}: {
  item: Item;
  active: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-body transition-colors",
        compact ? "shrink-0 whitespace-nowrap" : "w-full",
        active
          ? "bg-primary-surface text-primary"
          : "text-foreground hover:bg-sunken",
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className={compact ? undefined : "min-w-0 truncate"}>{item.label}</span>
    </Link>
  );
}
