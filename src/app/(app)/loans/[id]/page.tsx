import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CalendarClock, TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getLoanDetail } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { MemberAvatar } from "@/components/member-avatar";
import { DueLabel, ProgressRing } from "@/components/loan-card";
import { LoanPaymentButton } from "@/components/loan-payment-dialog";
import { PaymentActions } from "@/components/loan-actions";
import { LoanActionList } from "@/components/loan-action-list";
import { EmptyHint, SectionCard } from "@/components/page-shell";
import { loanHistoryTitle, loanPaidVerb, loanSideLabel } from "@/lib/copy";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const loan = await getLoanDetail(session!.user.id, id);
  if (!loan) notFound();

  const isLend = loan.type === "LEND";
  const percent = loan.amount > 0 ? Math.min(100, (loan.paid / loan.amount) * 100) : 0;
  const paidVerb = loanPaidVerb(loan.type);

  return (
    <div className="space-y-5">
      <Link
        href="/loans"
        className="inline-flex min-h-12 items-center gap-2 text-body text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" /> Quay lại Nợ
      </Link>

      {/* Thẻ tổng quan khoản mượn */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex min-w-0 items-center gap-4">
          <ProgressRing
            percent={percent}
            className={cn("size-16", isLend ? "text-income" : "text-warning")}
          >
            {isLend ? <ArrowUpRight className="size-6" /> : <ArrowDownLeft className="size-6" />}
          </ProgressRing>
          <div className="min-w-0">
            <h1 className="truncate text-page">{loan.counterparty}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={isLend ? "income" : "warning"}>{loanSideLabel(loan.type)}</Badge>
              {loan.status === "PAID" && <Badge variant="income">Xong rồi ✓</Badge>}
              {loan.status === "CANCELLED" && <Badge variant="muted">Đã bỏ</Badge>}
              {loan.status === "ACTIVE" && loan.overdue && (
                <Badge variant="destructive">Trễ hẹn trả</Badge>
              )}
              {loan.dueDate && <DueLabel dueDate={loan.dueDate} overdue={loan.overdue} />}
            </div>
          </div>
        </div>

        {/* Câu, không phải danh từ kế toán. */}
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-body text-muted-foreground">
            {isLend ? `${loan.counterparty} còn nợ bạn` : `Bạn còn nợ ${loan.counterparty}`}
          </p>
          <p
            className={cn(
              "num text-money-lg leading-tight",
              loan.remaining > 0
                ? isLend
                  ? "text-income"
                  : "text-expense"
                : "text-muted-foreground"
            )}
          >
            {formatMoney(loan.remaining)}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Figure label="Số tiền lúc đầu" value={formatMoney(loan.amount)} />
          <Figure
            label={isLend ? "Đã nhận lại" : "Đã trả"}
            value={`${formatMoney(loan.paid)} · ${Math.round(percent)}%`}
          />
          <Figure
            label={
              loan.interestRate ? `Tiền lãi tới hôm nay (${loan.interestRate}%/tháng)` : "Tiền lãi"
            }
            value={loan.interestRate ? formatMoney(loan.interest) : "Không tính lãi"}
          />
          <Figure label="Ngày mượn" value={formatDate(loan.date)} />
        </div>

        {/* Trả vượt số lúc đầu: có thể là tiền lãi, cũng có thể là ghi nhầm số */}
        {loan.overpaid > 0 && (
          <p className="mt-3 flex items-start gap-2.5 rounded-lg border border-warning bg-warning-surface p-3 text-body">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
            <span>
              Đã {paidVerb} nhiều hơn số lúc đầu {formatMoney(loan.overpaid)}. Nếu phần dư không
              phải tiền lãi thì soát lại danh sách bên dưới.
            </span>
          </p>
        )}

        {loan.stale && (
          <p className="mt-3 flex items-start gap-2.5 rounded-lg border border-border bg-sunken p-3 text-body text-muted-foreground">
            <CalendarClock className="mt-0.5 size-5 shrink-0" />
            <span>
              Khoản này chưa hẹn ngày trả và đã {loan.idleDays} ngày không ai động tới. Hẹn một
              ngày trả thì app mới nhắc bạn trước khi tới hẹn.
            </span>
          </p>
        )}

        {loan.note && (
          <p className="mt-3 rounded-lg bg-sunken p-3 text-body text-muted-foreground">
            {loan.note}
          </p>
        )}
      </div>

      {/* Nút chính, trải hết chiều ngang — việc người ta mở trang này để làm. */}
      {loan.status === "ACTIVE" && loan.remaining > 0 && (
        <LoanPaymentButton
          loanId={loan.id}
          type={loan.type}
          counterparty={loan.counterparty}
          remaining={loan.remaining}
          size="lg"
          className="w-full"
        />
      )}

      <SectionCard title={`${loanHistoryTitle(loan.type)} (${loan.payments.length})`}>
        {loan.payments.length === 0 ? (
          <EmptyHint>Chưa ghi lần trả nào.</EmptyHint>
        ) : (
          <>
            <div className="divide-y divide-border">
              {loan.payments.map((p) => (
                <div key={p.id} className="flex min-h-16 flex-wrap items-center gap-3 py-3">
                  <MemberAvatar user={p.createdBy} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <div className="text-body-lg">{formatDate(p.date)}</div>
                    <div className="truncate text-caption text-muted-foreground">
                      {p.note || p.createdBy.name || p.createdBy.email}
                    </div>
                  </div>
                  <span className="num shrink-0 text-money-row text-income">
                    +{formatMoney(p.amount)}
                  </span>
                  {/* Nút CÓ CHỮ, không phải ba chấm không nhãn như bản cũ. */}
                  <PaymentActions
                    variant="buttons"
                    loanId={loan.id}
                    type={loan.type}
                    payment={{ id: p.id, amount: p.amount, date: p.date, note: p.note }}
                    remainingWithout={Math.max(0, loan.amount - (loan.paid - p.amount))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-border pt-3 text-body">
              <span className="text-muted-foreground">Tổng {paidVerb}</span>
              <span className="num text-money-row">{formatMoney(loan.paid)}</span>
            </div>
          </>
        )}
      </SectionCard>

      {/* Menu "⋯" vẫn còn trên thẻ ở danh sách, nhưng năm việc đó cũng phải
          tìm được mà không cần đoán ra cái nút ba chấm. */}
      <LoanActionList
        groupId={loan.groupId}
        status={loan.status}
        paymentCount={loan.payments.length}
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
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-sunken px-3.5 py-3">
      <div className="text-caption text-muted-foreground">{label}</div>
      <div className="num mt-0.5 truncate text-body-lg">{value}</div>
    </div>
  );
}
