import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chuyển trang cho các bảng ở /admin.
 *
 * Cùng hình dáng với bộ chuyển trang của kho lưu nợ
 * (`(app)/loans/closed/page.tsx`): nút ở đầu/cuối danh sách vẫn CHIẾM CHỖ nhưng
 * thành chữ mờ không bấm được. Ẩn hẳn thì nút còn lại nhảy sang chỗ khác giữa
 * hai trang, và người bấm "Sau" hai lần liền sẽ bấm nhầm.
 *
 * Nhãn ở đây là "Trước/Sau" chứ không phải "Mới hơn/Cũ hơn": bảng admin sắp
 * theo nhiều thứ tự khác nhau, nên gọi theo thời gian sẽ sai ở phần lớn bảng.
 */
export function AdminPager({
  page,
  pages,
  total,
  makeHref,
}: {
  page: number;
  pages: number;
  total: number;
  /** Dựng URL cho một số trang, giữ nguyên `?q=` và các tham số khác. */
  makeHref: (page: number) => string;
}) {
  if (pages <= 1) {
    return <p className="text-caption text-muted-foreground">Tổng cộng {total}.</p>;
  }

  return (
    <nav
      aria-label="Chuyển trang"
      className="flex items-center justify-between gap-3 border-t border-border pt-3.5"
    >
      <PageLink href={makeHref(page - 1)} enabled={page > 1} icon={ChevronLeft} label="Trước" />
      <span className="text-caption text-muted-foreground">
        Trang {page} / {pages} · {total} mục
      </span>
      <PageLink
        href={makeHref(page + 1)}
        enabled={page < pages}
        icon={ChevronRight}
        label="Sau"
        trailing
      />
    </nav>
  );
}

function PageLink({
  href,
  enabled,
  icon: Icon,
  label,
  trailing = false,
}: {
  href: string;
  enabled: boolean;
  icon: React.ElementType;
  label: string;
  trailing?: boolean;
}) {
  const body = (
    <>
      {!trailing && <Icon className="size-5 shrink-0" aria-hidden />}
      {label}
      {trailing && <Icon className="size-5 shrink-0" aria-hidden />}
    </>
  );
  const shape = "inline-flex min-h-12 items-center gap-1.5 rounded-lg px-2 text-body";

  if (!enabled) {
    // Màu mờ, KHÔNG phải opacity: quy tắc giao diện cấm hạ opacity lên màu chữ
    // (scripts/check-ui-rules.sh) — chữ nào cũng phải đo được tương phản.
    return (
      <span aria-disabled className={cn(shape, "text-muted-foreground")}>
        {body}
      </span>
    );
  }

  return (
    <Link href={href} className={cn(shape, "focus-ring text-primary hover:bg-sunken")}>
      {body}
    </Link>
  );
}
