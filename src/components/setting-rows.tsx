import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Các hàng của trang Cài đặt — kiểu Settings của iOS: nhóm có tiêu đề, mỗi
 * nhóm là một khay bo góc, mỗi hàng là ô icon · nhãn (+ câu giải thích) ·
 * giá trị · mũi tên. Hàng cao ≥56px, cả hàng là vùng bấm, hover đổi nền.
 */

export type TileTone = "primary" | "income" | "expense" | "warning" | "neutral" | "solid";

const TILE: Record<TileTone, string> = {
  primary: "bg-primary-surface text-primary",
  income: "bg-income-surface text-income",
  expense: "bg-expense-surface text-expense",
  warning: "bg-warning-surface text-warning",
  neutral: "bg-sunken text-muted-foreground",
  solid: "bg-primary text-primary-foreground",
};

/** Ô icon ở đầu hàng. */
export function SettingIcon({ icon: Icon, tone = "primary" }: { icon: React.ElementType; tone?: TileTone }) {
  return (
    <span
      aria-hidden
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", TILE[tone])}
    >
      <Icon className="size-5" />
    </span>
  );
}

export function SettingGroup({
  title,
  action,
  footer,
  children,
  id,
}: {
  title: string;
  action?: React.ReactNode;
  /** Câu chú thích nhỏ dưới khay (như iOS). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1 pb-2">
        <h2 id={headingId} className="text-label text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {children}
      </div>
      {footer && <p className="px-1 pt-2 text-caption text-muted-foreground">{footer}</p>}
    </section>
  );
}

const rowBase =
  "flex min-h-16 w-full items-center gap-3.5 px-4 py-3 text-left transition-colors duration-150";

/** Hàng dẫn sang một trang khác. */
export function LinkRow({
  href,
  icon,
  label,
  hint,
  value,
  badge,
  tone = "primary",
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  hint?: string;
  /** Giá trị hiện tại, đứng trước mũi tên (vd. "3 sổ"). */
  value?: React.ReactNode;
  badge?: React.ReactNode;
  tone?: TileTone;
}) {
  return (
    <Link href={href} className={cn(rowBase, "focus-ring-inset cursor-pointer hover:bg-sunken")}>
      <SettingIcon icon={icon} tone={tone} />
      <RowText label={label} hint={hint} danger={tone === "expense"} badge={badge} />
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {value != null && (
          <span className="max-w-[9rem] truncate text-body text-muted-foreground">{value}</span>
        )}
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </span>
    </Link>
  );
}

/** Hàng chứa một control (công tắc, nhóm nút…) thay vì dẫn đi đâu. */
export function ControlRow({
  icon,
  label,
  hint,
  children,
  stacked = false,
  tone = "primary",
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  children: React.ReactNode;
  /** Control xuống dòng riêng bên dưới — dùng khi nó rộng (nhóm 3 ô…). */
  stacked?: boolean;
  tone?: TileTone;
}) {
  return (
    <div className={cn("px-4 py-3.5", stacked && "space-y-3.5")}>
      {/* flex-wrap + sàn 10rem cho phần chữ: control rộng thì tự rơi xuống
          dòng dưới thay vì bóp nhãn thành một chữ mỗi dòng ở chữ lớn. */}
      <div className="flex min-h-10 flex-wrap items-center gap-x-3.5 gap-y-3">
        <SettingIcon icon={icon} tone={tone} />
        <div className="min-w-0 grow basis-40">
          <div className="text-body-lg">{label}</div>
          {hint && <div className="text-caption text-muted-foreground">{hint}</div>}
        </div>
        {!stacked && <div className="ml-auto shrink-0">{children}</div>}
      </div>
      {stacked && children}
    </div>
  );
}

function RowText({
  label,
  hint,
  danger,
  badge,
}: {
  label: string;
  hint?: string;
  danger?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <span className="min-w-0 flex-1">
      {/* Nhãn là tên một trang — xuống dòng chứ không cắt ở chữ lớn. */}
      <span className={cn("block text-body-lg", danger && "text-destructive")}>{label}</span>
      {hint && <span className="block text-caption text-muted-foreground">{hint}</span>}
      {/* Badge nằm dưới nhãn, không ở cột phải: cột phải mà có cả badge lẫn
          giá trị thì nhãn bị bóp thành một chữ mỗi dòng trên điện thoại. */}
      {badge && <span className="mt-1.5 flex flex-wrap gap-1.5">{badge}</span>}
    </span>
  );
}

/** Hàng bấm được (nút) cùng dáng LinkRow — đăng xuất, mở hộp thoại… */
export function ButtonRow({
  icon,
  label,
  hint,
  tone = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ElementType;
  label: string;
  hint?: string;
  tone?: TileTone;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        rowBase,
        "focus-ring-inset cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50",
        props.className
      )}
    >
      <SettingIcon icon={icon} tone={tone} />
      <RowText label={label} hint={hint} danger={tone === "expense"} />
    </button>
  );
}
