import { notFound } from "next/navigation";
import { CalendarClock, HandCoins, StickyNote, TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getLoanDetail } from "@/lib/queries";
import { MemberAvatar } from "@/components/member-avatar";
import { LoanPaymentButton } from "@/components/loan-payment-dialog";
import { PaymentActions } from "@/components/loan-actions";
import { LoanActionList } from "@/components/loan-action-list";
import { BackLink } from "@/components/page-shell";
import { Amount } from "@/components/ui/amount";
import { CounterpartyAvatar, LoanProgressBar, LoanStatusBadge } from "@/components/loans/loan-bits";
import { loanAge, loanHistoryTitle, loanSideLabel } from "@/lib/copy";
import { memberLabel } from "@/lib/member";
import { cn, daysSince, formatDate, formatMoney } from "@/lib/utils";
import { LedgerLiveRefresh } from "@/components/ledger-live-refresh";

export const metadata = { title: "Khoản mượn" };

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const loan = await getLoanDetail(session!.user.id, id);
  if (!loan) notFound();

  const isLend = loan.type === "LEND";
  const active = loan.status === "ACTIVE";
  const paidLabel = isLend ? "Đã nhận lại" : "Đã trả";

  return (
    <div className="space-y-6">
      <LedgerLiveRefresh groupId={loan.groupId} />
      <BackLink href="/loans?view=loans" label="Quay lại Nợ" />

      <section aria-labelledby="loan-title" className="money-cq rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-center gap-4">
          <CounterpartyAvatar name={loan.counterparty} type={loan.type} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 id="loan-title" className="truncate text-page">
              {loan.counterparty}
            </h1>
            <p className="text-body text-muted-foreground">{loanSideLabel(loan.type)}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-body text-muted-foreground">
            {active
              ? isLend
                ? `${loan.counterparty} còn nợ bạn`
                : `Bạn còn nợ ${loan.counterparty}`
              : "Còn lại"}
          </p>
          <Amount
            value={isLend ? loan.remaining : -loan.remaining}
            tone={active && loan.remaining > 0 ? (isLend ? "income" : "expense") : "neutral"}
            size="hero"
            icon={active}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <LoanStatusBadge
              status={loan.status}
              dueDate={loan.dueDate}
              overdue={loan.overdue}
              stale={loan.stale}
              idleDays={loan.idleDays}
            />
          </div>
        </div>

        <LoanProgressBar type={loan.type} paid={loan.paid} amount={loan.amount} className="mt-5" />

        <dl className="mt-5 grid grid-cols-1 gap-2.5 @min-[16em]:grid-cols-2 @min-[36em]:grid-cols-4">
          <Figure label="Tiền gốc" value={formatMoney(loan.amount)} />
          <Figure label={paidLabel} value={formatMoney(loan.paid)} />
          <Figure label="Còn lại" value={formatMoney(loan.remaining)} />
          {loan.interestRate ? (
            <Figure
              label={`Lãi tạm tính (${loan.interestRate}%/tháng)`}
              value={formatMoney(loan.interest)}
            />
          ) : (
            <Figure
              label={loan.dueDate ? "Hẹn trả" : isLend ? "Ngày cho mượn" : "Ngày mượn"}
              value={formatDate(loan.dueDate ?? loan.date)}
              hint={!loan.dueDate && active ? loanAge(daysSince(loan.date)) : undefined}
            />
          )}
        </dl>

        {/* Trả vượt tiền gốc: có thể là lãi, cũng có thể là ghi nhầm số. */}
        {loan.overpaid > 0 && (
          <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-warning bg-warning-surface p-3 text-body">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <span>
              Đã {isLend ? "nhận lại" : "trả"} nhiều hơn tiền gốc {formatMoney(loan.overpaid)}. Nếu phần dư
              không phải tiền lãi thì soát lại lịch sử bên dưới.
            </span>
          </p>
        )}

        {loan.stale && (
          <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-warning bg-warning-surface p-3 text-body">
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <span>
              Khoản này chưa hẹn ngày trả và đã {loan.idleDays} ngày không ai động tới. Hẹn một ngày trả
              (trong “Sửa thông tin”) thì app sẽ nhắc trước khi tới hẹn.
            </span>
          </p>
        )}

        {loan.note && (
          <p className="mt-4 flex items-start gap-2.5 rounded-lg bg-sunken p-3 text-body">
            <StickyNote className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 break-words">{loan.note}</span>
          </p>
        )}
      </section>

      {/* Hành động chính duy nhất của trang. */}
      {active && loan.remaining > 0 && (
        <LoanPaymentButton
          loanId={loan.id}
          type={loan.type}
          counterparty={loan.counterparty}
          remaining={loan.remaining}
          size="lg"
          className="w-full"
        />
      )}

      <section aria-labelledby="history-title" className="space-y-3">
        <h2 id="history-title" className="text-title">
          {loanHistoryTitle(loan.type)}
          <span className="text-body font-normal text-muted-foreground"> · {loan.payments.length} lần</span>
        </h2>
        <ol className="rounded-xl border border-border bg-card px-4 py-2">
          {loan.payments.map((p) => (
            <TimelineItem
              key={p.id}
              date={p.date}
              icon={<MemberAvatar user={p.createdBy} className="size-9 ring-4 ring-card" />}
              title={
                <Amount
                  value={isLend ? p.amount : -p.amount}
                  tone={isLend ? "income" : "expense"}
                  size="row"
                />
              }
              detail={p.note || `Ghi bởi ${memberLabel(p.createdBy)}`}
              actions={
                <PaymentActions
                  variant="buttons"
                  loanId={loan.id}
                  type={loan.type}
                  payment={{ id: p.id, version: p.version, amount: p.amount, date: p.date, note: p.note }}
                  remainingWithout={Math.max(0, loan.amount - (loan.paid - p.amount))}
                />
              }
            />
          ))}
          {/* Mốc khởi đầu: ngày phát sinh khoản nợ. */}
          <TimelineItem
            last
            date={loan.date}
            icon={
              <span className="flex size-9 items-center justify-center rounded-full bg-sunken text-muted-foreground ring-4 ring-card">
                <HandCoins className="size-5" aria-hidden />
              </span>
            }
            title={
              <span className="text-body-lg">
                {isLend ? "Cho mượn" : "Mượn"} <span className="num font-semibold">{formatMoney(loan.amount)}</span>
              </span>
            }
            detail={
              loan.payments.length === 0
                ? `Chưa ghi lần trả nào${active ? ` · ${loanAge(daysSince(loan.date))}` : ""}`
                : active
                  ? loanAge(daysSince(loan.date))
                  : undefined
            }
          />
        </ol>
      </section>

      <LoanActionList
        groupId={loan.groupId}
        status={loan.status}
        paymentCount={loan.payments.length}
        remaining={loan.remaining}
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
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-sunken px-3.5 py-3">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      {/* Không cắt: số tiền / ngày cắt dở là thông tin sai. */}
      <dd className="num mt-0.5 text-body-lg font-semibold">{value}</dd>
      {hint && <dd className="text-caption text-muted-foreground">{hint}</dd>}
    </div>
  );
}

/** Một mốc trên dòng thời gian dọc: chấm/ảnh · ngày · nội dung · hành động. */
function TimelineItem({
  date,
  icon,
  title,
  detail,
  actions,
  last = false,
}: {
  date: Date;
  icon: React.ReactNode;
  title: React.ReactNode;
  detail?: string;
  actions?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-3.5 py-3">
      {/* Đường nối giữa các mốc */}
      {!last && <span aria-hidden className="absolute bottom-0 left-[1.125rem] top-12 w-px bg-border" />}
      <span className="relative shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <time dateTime={date.toISOString().slice(0, 10)} className="block text-caption text-muted-foreground">
          {formatDate(date)}
        </time>
        <div>{title}</div>
        {detail && <p className={cn("text-caption text-muted-foreground", "break-words")}>{detail}</p>}
        {actions && <div className="-ml-3 mt-1">{actions}</div>}
      </div>
    </li>
  );
}
