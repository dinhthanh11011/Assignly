import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Khối dựng trang của khu quản trị: tiêu đề + đường dẫn, lưới KPI, panel, cặp
 * nhãn–giá trị. Mật độ dày hơn app sổ (dashboard), cùng token và thang chữ.
 */

export type Crumb = { href: string; label: string };

/**
 * Tiêu đề trang. `crumbs` là các bậc CHA (không gồm trang hiện tại):
 * desktop hiện đủ "Quản trị › Người dùng", điện thoại chỉ hiện nút về bậc cha gần nhất.
 */
export function AdminPageHeader({
  title,
  description,
  crumbs,
  leading,
  meta,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  crumbs?: Crumb[];
  /** Avatar / icon cạnh tiêu đề. */
  leading?: React.ReactNode;
  /** Badge trạng thái ngay dưới tiêu đề. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const parent = crumbs?.at(-1);
  return (
    <header className="space-y-3">
      {crumbs && (
        <>
          <nav aria-label="Đường dẫn" className="hidden md:block">
            <ol className="flex flex-wrap items-center gap-1 text-caption text-muted-foreground">
              <li>
                <Link href="/admin" className="focus-ring rounded-sm hover:text-foreground hover:underline">
                  Quản trị
                </Link>
              </li>
              {crumbs.map((c) => (
                <li key={c.href} className="flex items-center gap-1">
                  <ChevronRight className="size-4 shrink-0" aria-hidden />
                  <Link href={c.href} className="focus-ring rounded-sm hover:text-foreground hover:underline">
                    {c.label}
                  </Link>
                </li>
              ))}
              <li className="flex min-w-0 items-center gap-1" aria-current="page">
                <ChevronRight className="size-4 shrink-0" aria-hidden />
                <span className="truncate text-foreground">{title}</span>
              </li>
            </ol>
          </nav>
          {parent && (
            <Link
              href={parent.href}
              className="focus-ring -ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-body font-medium text-primary md:hidden"
            >
              <ChevronLeft className="size-5 shrink-0" aria-hidden />
              {parent.label}
            </Link>
          )}
        </>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-72 items-start gap-4">
          {leading}
          <div className="min-w-0">
            <h1 className="text-page break-words">{title}</h1>
            {description && <p className="mt-1 text-body text-muted-foreground">{description}</p>}
            {meta && <div className="mt-2 flex flex-wrap items-center gap-1.5">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * Lưới KPI: 1 cột khi quá hẹp (cỡ chữ lớn), 2 cột điện thoại, 3 cột màn rộng.
 * Ngưỡng theo container và tính bằng rem nên tự lùi về ít cột hơn khi chữ to.
 */
export function AdminStatGrid({
  children,
  wide = 3,
}: {
  children: React.ReactNode;
  /** Số cột tối đa ở màn rộng. */
  wide?: 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 @min-[19rem]/admin:grid-cols-2",
        wide === 3 ? "@min-[52rem]/admin:grid-cols-3" : "@min-[52rem]/admin:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

/** Con số KPI ở cỡ hàng, chữ số đều bề ngang. */
export function KpiValue({ children }: { children: React.ReactNode }) {
  return <span className="num block truncate text-money-lg">{children}</span>;
}

/**
 * Thẻ có tiêu đề cho mọi khối trên trang admin. `flush` bỏ padding thân để
 * bảng/danh sách chạm mép thẻ.
 */
export function AdminPanel({
  title,
  hint,
  action,
  flush = false,
  className,
  children,
  id,
}: {
  title?: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      aria-labelledby={headingId}
      className={cn("min-w-0 rounded-xl border border-border bg-card", className)}
    >
      {title && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-3 md:px-5">
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-body-lg font-semibold">
              {title}
            </h2>
            {hint && <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={flush ? undefined : "p-4 md:p-5"}>{children}</div>
    </section>
  );
}

/** Link "Xem tất cả" ở góc panel. */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="focus-ring -my-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-body font-medium text-primary hover:underline"
    >
      {children}
      <ChevronRight className="size-4 shrink-0" aria-hidden />
    </Link>
  );
}

/** Danh sách mô tả (`<dl>`): screen reader biết đâu là nhãn, đâu là giá trị. */
export function AdminFacts({
  children,
  columns = 1,
}: {
  children: React.ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-6",
        columns === 2 && "@min-[34rem]/admin:grid-cols-2",
      )}
    >
      {children}
    </dl>
  );
}

/** Một hàng nhãn–giá trị: nhãn trái, giá trị phải; hẹp quá thì xuống dòng. */
export function AdminFact({
  label,
  children,
  numeric = false,
}: {
  label: string;
  children: React.ReactNode;
  numeric?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-border py-2.5 last:border-b-0">
      <dt className="text-body text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 text-right text-body break-words", numeric && "num")}>{children}</dd>
    </div>
  );
}
