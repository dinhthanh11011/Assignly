import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chân bảng: "26–50 / 132" + Trước/Sau.
 *
 * Nút ở đầu/cuối danh sách vẫn CHIẾM CHỖ (mờ, không bấm được) thay vì biến mất:
 * ẩn đi thì nút còn lại nhảy chỗ và người bấm "Sau" hai lần sẽ bấm nhầm.
 */
export function AdminPager({
  page,
  pages,
  total,
  pageSize,
  makeHref,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  /** URL cho một số trang, giữ nguyên tìm kiếm / lọc / sắp xếp. */
  makeHref: (page: number) => string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav
      aria-label="Chuyển trang"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border px-3 py-2 md:px-4"
    >
      <p className="num text-body text-muted-foreground" aria-live="polite">
        <span className="font-semibold text-foreground">
          {from.toLocaleString("vi-VN")}–{to.toLocaleString("vi-VN")}
        </span>{" "}
        / {total.toLocaleString("vi-VN")}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <PageLink href={makeHref(page - 1)} enabled={page > 1} label="Trước" />
          <PageLink href={makeHref(page + 1)} enabled={page < pages} label="Sau" trailing />
        </div>
      )}
    </nav>
  );
}

function PageLink({
  href,
  enabled,
  label,
  trailing = false,
}: {
  href: string;
  enabled: boolean;
  label: string;
  trailing?: boolean;
}) {
  const Icon = trailing ? ChevronRight : ChevronLeft;
  const body = (
    <>
      {!trailing && <Icon className="size-5 shrink-0" aria-hidden />}
      {label}
      {trailing && <Icon className="size-5 shrink-0" aria-hidden />}
    </>
  );
  const shape =
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-3 text-body font-medium";

  if (!enabled) {
    // Chữ mờ bằng token, không bằng opacity — tương phản vẫn đo được.
    return (
      <span aria-disabled="true" className={cn(shape, "border-border text-muted-foreground")}>
        {body}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        shape,
        "focus-ring border-input bg-card text-foreground transition-colors duration-150 hover:bg-sunken",
      )}
    >
      {body}
    </Link>
  );
}
