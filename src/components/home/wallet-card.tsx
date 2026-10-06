import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { Delta } from "@/components/ui/stat";
import { Sparkline } from "@/components/home/sparkline";
import { cn, formatMoney } from "@/lib/utils";

/**
 * Thẻ "ví" của tháng: còn lại bao nhiêu (to nhất trang), tiền vào / tiền ra,
 * nhịp chi trong tháng, và so với tháng trước. Bấm sang Sổ để xem chi tiết.
 */
export function WalletCard({
  monthLabel,
  income,
  expense,
  prevExpense,
  dailyExpense,
  href,
  className,
}: {
  className?: string;
  monthLabel: string;
  income: number;
  expense: number;
  /** Chi của tháng trước, CÙNG SỐ NGÀY đã trôi qua — để so công bằng. */
  prevExpense: number | null;
  dailyExpense: number[];
  href: string;
}) {
  const balance = income - expense;
  const delta = prevExpense && prevExpense > 0 ? (expense - prevExpense) / prevExpense : null;
  return (
    <section
      aria-labelledby="wallet-title"
      className={cn("money-cq overflow-hidden rounded-2xl border border-border bg-card", className)}
    >
      <div className="p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="wallet-title" className="text-label text-muted-foreground">
            Còn lại · {monthLabel}
          </h2>
          <Link
            href={href}
            className="focus-ring -mr-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-label text-primary hover:underline"
          >
            Xem sổ <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <Amount value={balance} size="hero" className="mt-1" />
        {delta !== null && (
          <div className="mt-2">
            <Delta value={delta} goodWhen="down" />
            <span className="sr-only"> (chi tiêu)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 border-t border-border @min-[22em]:grid-cols-2">
        <Figure label="Tiền vào" value={income} tone="income" />
        <Figure label="Tiền ra" value={expense} tone="expense" className="border-t @min-[22em]:border-l @min-[22em]:border-t-0" />
      </div>

      {dailyExpense.some((v) => v > 0) && (
        <div className="border-t border-border px-5 pb-3 pt-4 md:px-6">
          <p className="text-caption text-muted-foreground">Chi tiêu cộng dồn trong tháng</p>
          <Sparkline
            values={dailyExpense}
            className="mt-2 h-14 w-full"
            label={`Chi tiêu cộng dồn trong ${monthLabel.toLowerCase()}, tổng ${formatMoney(expense)}`}
          />
        </div>
      )}
    </section>
  );
}

function Figure({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: number;
  tone: "income" | "expense";
  className?: string;
}) {
  const Icon = tone === "income" ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className={cn("flex min-w-0 items-center gap-3 border-border px-5 py-4 md:px-6", className)}>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          tone === "income" ? "bg-income-surface text-income" : "bg-expense-surface text-expense"
        )}
        aria-hidden
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-caption text-muted-foreground">{label}</p>
        <Amount value={value} tone={tone} size="row" />
      </div>
    </div>
  );
}
