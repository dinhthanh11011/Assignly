import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Hàng chip lọc nhanh. Link thật (không phải state): lọc nằm trên URL nên đi
 * qua được phân trang, Back và chia sẻ link.
 */
export function FilterChips({
  label,
  options,
}: {
  /** Tên nhóm cho screen reader, ví dụ "Lọc theo trạng thái". */
  label: string;
  options: { label: string; href: string; active: boolean; count?: number }[];
}) {
  return (
    <nav aria-label={label} className="-mx-1 flex flex-wrap gap-1.5 px-1">
      {options.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          scroll={false}
          aria-current={o.active ? "true" : undefined}
          className={cn(
            "focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-body font-medium transition-colors duration-150",
            o.active
              ? "border-primary bg-primary-surface text-primary"
              : "border-border bg-card text-foreground hover:bg-sunken",
          )}
        >
          {o.label}
          {o.count != null && (
            <span
              className={cn(
                "num rounded-full px-1.5 text-caption",
                o.active ? "bg-card text-primary" : "bg-sunken text-muted-foreground",
              )}
            >
              {o.count.toLocaleString("vi-VN")}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Dựng URL của trang danh sách từ tham số hiện tại + phần đổi. Giá trị bằng
 * mặc định thì bỏ khỏi URL cho gọn; đổi lọc/sắp/tìm thì về trang 1.
 */
export function listHref(
  base: string,
  current: Record<string, string | number | undefined>,
  patch: Record<string, string | number | undefined>,
  defaults: Record<string, string | number>,
) {
  const merged = { ...current, ...patch };
  if (!("page" in patch)) delete merged.page;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || defaults[k] === v) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}
