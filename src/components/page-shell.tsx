import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";

/** Hiện khi người dùng chưa thuộc sổ nào — mọi trang dữ liệu đều cần một sổ. */
export function NoGroupState() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center">
      <div className="w-full max-w-sm text-center">
        <span className="brand-gradient mx-auto mb-5 flex size-14 items-center justify-center rounded-xl shadow-lift">
          <Wallet className="size-7 text-white" />
        </span>
        <h1 className="text-xl font-bold tracking-tight">Chào mừng đến Sổ Thu Chi 👋</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tạo sổ đầu tiên để bắt đầu ghi thu chi, theo dõi các khoản cho vay và nhắc thu nợ.
          Dùng riêng hoặc mời người thân ghi chung.
        </p>
        <Button asChild variant="gradient" size="lg" className="mt-6 w-full">
          <Link href="/groups">
            Tạo sổ ngay <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function PageHeader({
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
        <h1 className="truncate text-[1.4rem] font-bold tracking-tight md:text-[1.65rem]">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/**
 * Thẻ số dư chính: nền gradient thương hiệu, số dư cỡ lớn, thu/chi ở chân thẻ.
 * Đây là điểm nhấn thị giác của trang tổng quan.
 */
export function BalanceHero({
  label,
  balance,
  income,
  expense,
  footer,
}: {
  label: string;
  balance: number;
  income: number;
  expense: number;
  footer?: React.ReactNode;
}) {
  return (
    <div className="brand-gradient relative overflow-hidden rounded-xl p-5 text-white shadow-lift md:p-6">
      {/* Hai vòng sáng mờ tạo chiều sâu cho nền gradient */}
      <span className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-white/12 blur-2xl" />
      <span className="pointer-events-none absolute -bottom-28 -left-10 size-56 rounded-full bg-white/10 blur-2xl" />

      <div className="relative">
        <p className="text-[13px] font-medium text-white/75">{label}</p>
        <p className="num-lg mt-1 text-[2.1rem] font-bold leading-tight md:text-[2.5rem]">
          {formatMoney(balance)}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <HeroFigure label="Tiền vào" value={income} tone="in" />
          <HeroFigure label="Tiền ra" value={expense} tone="out" />
        </div>

        {footer && <div className="mt-4 border-t border-white/15 pt-3 text-sm">{footer}</div>}
      </div>
    </div>
  );
}

function HeroFigure({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "in" | "out";
}) {
  return (
    <div className="rounded-md bg-white/12 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/75">
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "in" ? "bg-emerald-300" : "bg-rose-300"
          )}
        />
        {label}
      </div>
      <div className="num mt-0.5 truncate text-[15px] font-bold">{formatMoney(value)}</div>
    </div>
  );
}

/** Thẻ số liệu nhỏ: icon nền nhạt + giá trị + nhãn. */
export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: "primary" | "income" | "expense" | "warning";
  hint?: string;
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    income: "bg-income/12 text-income",
    expense: "bg-expense/12 text-expense",
    warning: "bg-warning/18 text-warning",
  }[tone];

  return (
    <Card className="transition-shadow hover:shadow-lift">
      <CardContent className="flex items-center gap-3.5 p-4">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", toneClass)}>
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <div className="num truncate text-[17px] font-bold leading-tight">{value}</div>
          <div className="truncate text-xs text-muted-foreground">{label}</div>
          {hint && <div className="truncate text-[11px] text-muted-foreground/80">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

/** Khối nội dung có tiêu đề + hành động phụ ở góc phải. */
export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-4">
        <h2 className="text-[0.95rem] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

/** Ô trống trong một khối nội dung. */
export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
