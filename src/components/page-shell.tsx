import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";

/** Hiện khi người dùng chưa thuộc sổ nào — mọi trang dữ liệu đều cần một sổ. */
export function NoGroupState() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center">
      <div className="w-full max-w-sm text-center">
        <span className="brand-gradient mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl shadow-lift">
          <Wallet className="size-8 text-white" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Chào mừng đến Sổ Thu Chi</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Tạo sổ đầu tiên để bắt đầu ghi thu chi, theo dõi các khoản cho vay và nhắc thu nợ. Dùng
          riêng hoặc mời người thân ghi chung.
        </p>
        <Button asChild variant="gradient" size="lg" className="mt-7 w-full">
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
        {subtitle && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {subtitle}
          </p>
        )}
        <h1 className="mt-1 truncate text-[1.6rem] font-bold tracking-tight md:text-[2rem]">
          {title}
        </h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/**
 * Panel số dư — điểm nhấn thị giác của cả app. Nền ink có ba vệt sáng, con số cỡ
 * hero bằng mono, và hai ô kính thu/chi kèm thanh tỉ lệ để thấy ngay bên nào nặng.
 * Luôn tối ở cả hai theme: đây là "màn hình đen" quen thuộc của app tài chính.
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
  const total = income + expense;
  const inShare = total > 0 ? (income / total) * 100 : 50;
  const positive = balance >= 0;

  return (
    <section className="hero-panel glass-edge relative overflow-hidden rounded-2xl p-5 text-white shadow-lift md:p-7">
      <div className="relative">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
              positive ? "bg-[oklch(0.9_0.21_124)]/20 text-[oklch(0.9_0.21_124)]" : "bg-white/15"
            )}
          >
            {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {positive ? "Dư" : "Âm"}
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            {label}
          </p>
        </div>

        <p className="num-hero rise-in mt-3 text-white">{formatMoney(balance)}</p>

        {/* Thanh tỉ lệ vào/ra: đọc nhanh hơn hai con số rời */}
        <div className="mt-5 flex h-1.5 overflow-hidden rounded-full bg-white/12">
          <span
            className="h-full rounded-full bg-[oklch(0.86_0.17_152)]"
            style={{ width: `${inShare}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <HeroFigure label="Tiền vào" value={income} tone="in" />
          <HeroFigure label="Tiền ra" value={expense} tone="out" />
        </div>

        {footer && <div className="mt-5 border-t border-white/12 pt-3.5 text-sm">{footer}</div>}
      </div>
    </section>
  );
}

function HeroFigure({ label, value, tone }: { label: string; value: number; tone: "in" | "out" }) {
  return (
    <div className="rounded-lg bg-white/[0.07] px-3.5 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-white/60">
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "in" ? "bg-[oklch(0.86_0.17_152)]" : "bg-[oklch(0.7_0.18_22)]"
          )}
        />
        {label}
      </div>
      <div className="num-lg mt-1 truncate text-[17px] font-bold">{formatMoney(value)}</div>
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
    primary: "bg-primary/14 text-primary",
    income: "bg-income/14 text-income",
    expense: "bg-expense/14 text-expense",
    warning: "bg-warning/20 text-warning",
  }[tone];

  return (
    <Card className="transition-shadow duration-200 hover:shadow-lift">
      <CardContent className="flex items-center gap-3.5 p-4">
        <span
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", toneClass)}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="num-lg truncate text-[18px] font-bold leading-tight">{value}</div>
          <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
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
      <div className="flex items-center justify-between gap-2 px-5 pb-3.5 pt-4.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

/** Ô trống trong một khối nội dung. */
export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border py-9 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
