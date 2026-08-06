import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoanPaymentButton } from "@/components/loan-payment-dialog";
import { LoanActions } from "@/components/loan-actions";
import { dueSentence, loanPaidVerb, loanSideLabel } from "@/lib/copy";
import { cn, daysUntil, formatDate, formatMoney } from "@/lib/utils";

export type LoanCardData = {
  id: string;
  groupId: string;
  type: "LEND" | "BORROW";
  counterparty: string;
  amount: number;
  date: Date;
  dueDate: Date | null;
  interestRate: number | null;
  note: string | null;
  status: "ACTIVE" | "PAID" | "CANCELLED";
  paid: number;
  remaining: number;
  overdue: boolean;
  /** Không có hạn trả và đã lâu không thu/trả — dễ bị bỏ quên. */
  stale?: boolean;
  idleDays?: number;
};

/** Nhãn hạn trả: trễ hẹn / còn N ngày / ngày cụ thể. */
export function DueLabel({ dueDate, overdue }: { dueDate: Date; overdue: boolean }) {
  const days = daysUntil(new Date(dueDate));
  // Trong vòng hai tuần thì nói bằng câu ("Trễ hẹn 5 ngày"); xa hơn thì đưa
  // ngày cụ thể, vì "còn 63 ngày" không giúp ai hình dung được gì.
  const text = dueSentence(overdue && days < 0 ? days : days) || `Hẹn trả ${formatDate(new Date(dueDate))}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-caption",
        overdue ? "font-bold text-expense" : "text-muted-foreground"
      )}
    >
      <CalendarClock className="size-4 shrink-0" /> {text}
    </span>
  );
}

/** Vòng tiến độ SVG — trực quan hơn thanh ngang khi đặt cạnh số tiền. */
export function ProgressRing({
  percent,
  className,
  children,
}: {
  percent: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, percent)) / 100) * c;

  return (
    <span className={cn("relative inline-flex size-12 shrink-0", className)}>
      <svg viewBox="0 0 48 48" className="size-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" className="stroke-current opacity-15" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="stroke-current"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}

export function LoanCard({
  loan,
  paymentCount = 0,
}: {
  loan: LoanCardData;
  paymentCount?: number;
}) {
  const isLend = loan.type === "LEND";
  const percent = loan.amount > 0 ? (loan.paid / loan.amount) * 100 : 0;
  const done = loan.status !== "ACTIVE";
  const tone = isLend ? "text-income" : "text-warning";

  return (
    <div
      className={cn(
        "group relative rounded-xl border-[1.5px] border-border bg-card p-4 shadow-soft transition-shadow duration-200 hover:shadow-lift",
        done && "opacity-65"
      )}
    >
      {/* Cả thẻ là một liên kết: lớp phủ nằm dưới (z-0) nên các nút bên trong
          (thu/trả nợ, menu "…") vẫn bấm được nhờ được nâng lên z-10. Không lồng
          <button> trong <a> — HTML không cho, và trên mobile sẽ bấm nhầm. */}
      <Link
        href={`/loans/${loan.id}`}
        aria-label={`Xem chi tiết khoản mượn của ${loan.counterparty}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
      />
      <div className="flex items-start gap-3.5">
        <ProgressRing percent={percent} className={tone}>
          {isLend ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="truncate text-body-lg transition-colors group-hover:text-primary">
              {loan.counterparty}
            </span>
            <span
              className={cn(
                "num shrink-0 text-money-row",
                loan.remaining > 0 ? tone : "text-muted-foreground"
              )}
            >
              {formatMoney(loan.remaining)}
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant={isLend ? "income" : "warning"}>
              {isLend ? <ArrowUpRight /> : <ArrowDownLeft />}
              {loanSideLabel(loan.type)}
            </Badge>
            <span className="num text-caption text-muted-foreground">
              lúc đầu {formatMoney(loan.amount)} · {loanPaidVerb(loan.type)} {Math.round(percent)}%
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {loan.dueDate && loan.status === "ACTIVE" && (
                <DueLabel dueDate={loan.dueDate} overdue={loan.overdue} />
              )}
              {loan.status === "PAID" && <Badge variant="income">Đã trả xong</Badge>}
              {loan.status === "CANCELLED" && <Badge variant="muted">Đã bỏ</Badge>}
              {loan.status === "ACTIVE" && loan.overdue && (
                <Badge variant="destructive">Trễ hẹn trả</Badge>
              )}
              {loan.stale && (
                <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                  <CalendarClock className="size-4 shrink-0" /> Chưa hẹn ngày trả ·{" "}
                  {loan.idleDays} ngày chưa động tới
                </span>
              )}
            </div>
            {/* z-10: nằm trên lớp phủ liên kết để bấm được */}
            <div className="relative z-10 flex items-center gap-1.5">
              {loan.status === "ACTIVE" && loan.remaining > 0 && (
                <LoanPaymentButton
                  loanId={loan.id}
                  type={loan.type}
                  counterparty={loan.counterparty}
                  remaining={loan.remaining}
                  variant="soft"
                  size="sm"
                />
              )}
              {/* Sửa / xoá ngay tại danh sách, không phải mở trang chi tiết */}
              <LoanActions
                groupId={loan.groupId}
                status={loan.status}
                paymentCount={paymentCount}
                size="sm"
                loan={{
                  id: loan.id,
                  type: loan.type,
                  counterparty: loan.counterparty,
                  amount: loan.amount,
                  date: loan.date,
                  dueDate: loan.dueDate,
                  interestRate: loan.interestRate,
                  note: loan.note,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
