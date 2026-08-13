"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Handshake, Notebook, Settings, Wallet } from "lucide-react";
import { NavItemPending, useNavLinkPending } from "@/components/nav-progress";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.ElementType };

/**
 * BỐN đích đến, không hơn.
 *
 * Bản cũ có tám mục chia hai nhóm, mà thanh dưới trên điện thoại chỉ hiện được
 * bốn — nên "Danh mục" và "Cài đặt" phải trốn trong menu avatar, còn "Cân đối"
 * và "Sổ chung" chỉ vào được qua một cái thẻ ở trang tổng quan. Nghĩa là một
 * nửa app không tìm thấy được trên điện thoại.
 *
 * Nay mọi thứ quản lý nằm trong tab "Cài đặt" (kiểu Settings của iOS: một trang
 * dài toàn hàng có nhãn), nên không còn gì bị giấu và không cần mục thứ năm.
 *
 * Tên gọi cố ý tránh tiếng ngân hàng: "ghi chép" là việc bà ngoại làm với cuốn
 * sổ giấy — mà đây đúng là cuốn sổ đó; "vay" là động từ giao dịch, còn "nợ" mới
 * là cái trạng thái người dùng quan tâm.
 *
 * Trang biểu đồ từng mang nhãn "Xem lại" vì "báo cáo" nghe như thứ phải nộp ở cơ
 * quan. Nay là "Báo cáo": đó là từ người dùng tự gọi nó, và "xem lại" thì mơ hồ
 * — xem lại CÁI GÌ? Cả trang chủ cũng là chỗ xem lại những khoản đã ghi. Hai
 * nhãn dài bằng nhau (7 ký tự) nên chỗ trong thanh nổi không đổi.
 */
const NAV: Item[] = [
  { href: "/", label: "Ghi chép", icon: Notebook },
  { href: "/loans", label: "Nợ", icon: Handshake },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

/** Thanh nổi để trống ô giữa cho nút "Ghi" (xem QuickAddButton). */
const MOBILE: (Item | null)[] = [NAV[0], NAV[1], null, NAV[2], NAV[3]];

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
      aria-label="Sổ Thu Chi — về trang ghi chép"
      className={cn(
        "focus-ring flex min-h-12 items-center gap-2.5 rounded-lg",
        className
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary">
        <Wallet className="size-5 text-primary-foreground" />
      </span>
      {!compact && (
        <span className="text-title leading-tight">
          Sổ<span className="text-primary"> Thu Chi</span>
        </span>
      )}
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
        "size-1.5 rounded-full bg-primary transition-opacity",
        pending ? "animate-pulse opacity-100" : active ? "opacity-100" : "opacity-0"
      )}
    />
  );
}

export function AppNav({ picker, footer }: { picker?: React.ReactNode; footer?: React.ReactNode }) {
  const pathname = usePathname();

  const link = (it: Item) => {
    const active = isActive(pathname, it.href);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "focus-ring flex min-h-12 items-center gap-3 rounded-md px-4 text-body font-semibold transition-colors duration-150",
          active
            ? "bg-primary-surface text-primary"
            : "text-muted-foreground hover:bg-sunken hover:text-foreground"
        )}
      >
        <it.icon className="size-6 shrink-0" />
        {it.label}
        {/* Trang nào cũng phải hỏi server — chấm này xác nhận cú bấm ngay lập tức. */}
        <NavItemPending className="ml-auto" />
      </Link>
    );
  };

  return (
    <>
      {/* Thanh bên (màn hình lớn) */}
      <aside className="surface-bar fixed inset-y-0 left-0 z-30 hidden w-[268px] flex-col border-r pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>
        {picker && <div className="px-3 pb-3">{picker}</div>}
        <nav className="flex flex-1 flex-col gap-1 px-3">{NAV.map(link)}</nav>
        {footer && <div className="border-t border-border p-3">{footer}</div>}
      </aside>

      {/* Thanh nổi (điện thoại). Mỗi mục CÓ CHỮ — chỉ có icon là kiểu điều hướng
          tệ nhất với người lớn tuổi, vì phải đoán nghĩa từng hình. Bản cũ chỉ có
          icon cộng một chấm 4px. */}
      {/* Lề ngang lấy max() với vùng an toàn hai bên: nằm ngang trên iPhone tai
          thỏ thì 0.75rem không đủ, mục ngoài cùng chui xuống dưới tai thỏ và bấm
          không được. Cố ý ĐỐI XỨNG (max của cả hai bên) để ô trống ở giữa vẫn
          trùng đúng tâm màn hình — nút "Ghi" nổi neo theo left-1/2 của viewport,
          lề lệch một bên là hai thứ lệch nhau.

          Lề/khe/padding đã siết lại (0.5rem / 0 / 0.25rem) vì đó là ĐÚNG chỗ để
          lấy lại bề rộng cho nhãn: "Ghi chép" là nhãn dài nhất, ở mức cũ nó
          thiếu 3px và bị cắt thành "Ghi ch…" ngay tại cỡ chữ mặc định. Giờ vừa
          đủ, còn thừa ~2px. Các mục vẫn rộng bằng nhau nên khe 0 không lệch gì. */}
      <nav
        // rounded-2xl, không còn viên thuốc: thanh này là TẤM NỔI (bậc 2xl của
        // thang bo góc), không phải một cái nút khổng lồ. Thanh nav hình viên
        // thuốc là dấu hiệu rõ nhất của lứa giao diện 2021.
        className="surface-float fixed inset-x-[max(0.5rem,env(safe-area-inset-left),env(safe-area-inset-right))] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 flex items-center justify-around gap-0 rounded-2xl p-1 md:hidden"
        aria-label="Điều hướng chính"
      >
        {MOBILE.map((it) =>
          it === null ? (
            // Ô trống đúng chỗ nút "Ghi" nổi đè lên
            <span key="fab-slot" className="w-16 shrink-0" aria-hidden />
          ) : (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(pathname, it.href) ? "page" : undefined}
              className={cn(
                // min-w-0: flex item mặc định KHÔNG co xuống dưới bề rộng chữ,
                // nên chỉ riêng flex-1 là chưa đủ — trên máy 360px, hoặc khi
                // người dùng chọn cỡ chữ lớn (fs-lg: 13px → ~17px trong khi màn
                // hình không rộng thêm), "Ghi chép" đẩy các mục tràn khỏi viên
                // thanh và đè lên nút "Ghi" ở giữa.
                "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 transition-colors duration-150",
                isActive(pathname, it.href)
                  ? "bg-primary-surface text-primary"
                  : "text-muted-foreground active:bg-sunken"
              )}
            >
              <it.icon className="size-6 shrink-0" />
              <span className="w-full truncate text-center text-caption leading-none">
                {it.label}
              </span>
              <MobileNavDot active={isActive(pathname, it.href)} />
            </Link>
          )
        )}
      </nav>
    </>
  );
}
