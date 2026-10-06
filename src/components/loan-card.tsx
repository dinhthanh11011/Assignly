import Link from "next/link";
import { LoanPaymentButton } from "@/components/loan-payment-dialog";
import { LoanActions } from "@/components/loan-actions";
import { Amount } from "@/components/ui/amount";
import {
  ClosedOn,
  CounterpartyAvatar,
  LoanProgressBar,
  LoanStatusBadge,
} from "@/components/loans/loan-bits";
import { loanAgeSentence } from "@/lib/copy";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export type LoanCardData = {
  id: string;
  version: number;
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
  /** Ngày khoản này xong — chỉ kho lưu `/loans/closed` truyền vào. */
  closedAt?: Date | null;
};

/**
 * Thẻ một khoản mượn: người · số còn lại (to nhất) · thanh đã trả · hạn trả ·
 * nút ghi trả. Cả thẻ là một liên kết sang trang chi tiết.
 */
export function LoanCard({ loan, paymentCount = 0 }: { loan: LoanCardData; paymentCount?: number }) {
  const isLend = loan.type === "LEND";
  const active = loan.status === "ACTIVE";
  const badge = (
    <LoanStatusBadge
      status={loan.status}
      dueDate={loan.dueDate}
      overdue={loan.overdue}
      stale={loan.stale}
      idleDays={loan.idleDays}
    />
  );

  return (
    <article className="group relative flex flex-col gap-3.5 rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:bg-sunken">
      {/* Lớp phủ liên kết nằm dưới (z-0); các nút bên trong được nâng lên z-10.
          Không lồng <button> trong <a>: HTML không cho, và mobile sẽ bấm nhầm. */}
      <Link
        href={`/loans/${loan.id}`}
        aria-label={`Xem khoản mượn của ${loan.counterparty}`}
        className="focus-ring absolute inset-0 z-0 rounded-xl"
      />

      <div className="flex items-start gap-3">
        <CounterpartyAvatar name={loan.counterparty} type={loan.type} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-body-lg">{loan.counterparty}</h3>
          <p className="text-caption text-muted-foreground">
            {active
              ? loanAgeSentence(loan.type, new Date(loan.date))
              : `${isLend ? "Cho mượn" : "Mượn"} ${formatDate(new Date(loan.date))}`}
          </p>
        </div>
      </div>

      {/* Số còn lại — thứ người dùng mở trang này để biết. */}
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="text-caption text-muted-foreground">
            {active
              ? isLend
                ? "Họ còn nợ bạn"
                : "Bạn còn nợ họ"
              : isLend
                ? `Đã nhận lại / cho mượn ${formatMoney(loan.amount)}`
                : `Đã trả / mượn ${formatMoney(loan.amount)}`}
          </p>
          {active ? (
            <Amount
              value={isLend ? loan.remaining : -loan.remaining}
              tone={loan.remaining > 0 ? (isLend ? "income" : "expense") : "neutral"}
              size="lg"
              icon
            />
          ) : (
            <Amount value={loan.paid} tone="neutral" size="lg" />
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {active && <LoanProgressBar type={loan.type} paid={loan.paid} amount={loan.amount} showFigures />}

      {loan.note && <p className="line-clamp-2 text-caption text-muted-foreground">{loan.note}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!active && loan.closedAt ? <ClosedOn date={loan.closedAt} /> : <span />}
        <div className={cn("relative z-10 flex min-w-0 items-center gap-1.5", !active && "ml-auto")}>
          {active && loan.remaining > 0 && (
            <LoanPaymentButton
              loanId={loan.id}
              type={loan.type}
              counterparty={loan.counterparty}
              remaining={loan.remaining}
              variant="soft"
              size="sm"
              compact
            />
          )}
          <LoanActions
            groupId={loan.groupId}
            status={loan.status}
            paymentCount={paymentCount}
            remaining={loan.remaining}
            size="sm"
            loan={{
              id: loan.id,
              version: loan.version,
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
    </article>
  );
}
