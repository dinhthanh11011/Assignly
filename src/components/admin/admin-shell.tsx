import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Bản mật độ desktop của `page-shell.tsx`.
 *
 * Không dùng lại thẳng `PageHeader`/`StatCard` được: chúng được chỉnh cho một
 * cột trên điện thoại (`text-money-lg` cho mỗi con số, thẻ cao 5rem, icon tròn
 * 3rem). Ở /admin có tám con số cạnh nhau trên màn 1440px — cùng kích cỡ ấy thì
 * một hàng KPI chiếm trọn màn hình đầu tiên và đẩy bảng xuống dưới nếp gấp.
 */

export function AdminPageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-page">{title}</h1>
        {subtitle && <p className="mt-1 text-body text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Lưới KPI. grid-cols-1 ở gốc là bắt buộc (check-ui-rules luật 11). */
export function AdminStatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 @min-[34rem]/admin:grid-cols-2 @min-[60rem]/admin:grid-cols-4">
      {children}
    </div>
  );
}

export function AdminStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  /** Một câu ngắn nói con số này nghĩa là gì. Một con số trần không tự nói được. */
  hint?: string;
  tone?: "default" | "income" | "expense" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    income: "text-income",
    expense: "text-expense",
    warning: "text-warning",
  }[tone];

  return (
    <Card className="transition-colors duration-200 hover:border-border-strong">
      <CardContent className="p-4">
        <div className="text-label text-muted-foreground">{label}</div>
        <div className={cn("num mt-1 text-money-row", toneClass)}>{value}</div>
        {hint && <div className="mt-1 text-caption text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

/** Khối có tiêu đề, dùng cho mọi bảng và biểu đồ trên các trang admin. */
export function AdminSection({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  /** Câu giải thích khối này đang đếm cái gì — quan trọng ở chỗ số dễ bị hiểu sai. */
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-title">{title}</h2>
          {hint && <p className="mt-1 text-caption text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Cặp nhãn–giá trị cho các trang chi tiết. Dùng `<dl>` để screen reader biết
 * đâu là nhãn đâu là giá trị.
 */
export function AdminFacts({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 @min-[34rem]/admin:grid-cols-2">{children}</dl>
  );
}

export function AdminFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-body break-words">{children}</dd>
    </div>
  );
}
