import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getLoanDetail } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { MemberAvatar } from "@/components/member-avatar";
import { DueLabel, ProgressRing } from "@/components/loan-card";
import { LoanPaymentButton } from "@/components/loan-payment-dialog";
import { DeletePaymentButton, LoanActions } from "@/components/loan-actions";
import { EmptyHint, SectionCard } from "@/components/page-shell";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const loan = await getLoanDetail(session!.user.id, id);
  if (!loan) notFound();

  const isLend = loan.type === "LEND";
  const percent = loan.amount > 0 ? Math.min(100, (loan.paid / loan.amount) * 100) : 0;

  return (
    <div className="space-y-5">
      <Link
        href="/loans"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Cho vay & Nợ
      </Link>

      {/* Thẻ tổng quan khoản vay */}
      <div className="rounded-xl border border-hairline bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <ProgressRing
              percent={percent}
              className={cn("size-16", isLend ? "text-income" : "text-warning")}
            >
              {isLend ? (
                <ArrowUpRight className="size-5" />
              ) : (
                <ArrowDownLeft className="size-5" />
              )}
            </ProgressRing>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">
                {loan.counterparty}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={isLend ? "income" : "warning"}>
                  {isLend ? "Bạn cho vay" : "Bạn đang nợ"}
                </Badge>
                {loan.status === "PAID" && <Badge variant="income">Đã tất toán</Badge>}
                {loan.status === "CANCELLED" && <Badge variant="muted">Đã huỷ</Badge>}
                {loan.status === "ACTIVE" && loan.overdue && (
                  <Badge variant="destructive">Quá hạn</Badge>
                )}
                {loan.dueDate && <DueLabel dueDate={loan.dueDate} overdue={loan.overdue} />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loan.status === "ACTIVE" && loan.remaining > 0 && (
              <LoanPaymentButton
                loanId={loan.id}
                type={loan.type}
                counterparty={loan.counterparty}
                remaining={loan.remaining}
              />
            )}
            <LoanActions
              groupId={loan.groupId}
              status={loan.status}
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

        <div className="mt-5 border-t border-border/60 pt-4">
          <p className="text-[13px] text-muted-foreground">
            {isLend ? "Còn phải thu" : "Còn phải trả"}
          </p>
          <p
            className={cn(
              "num-lg text-[2rem] font-bold leading-tight",
              loan.remaining > 0 ? (isLend ? "text-income" : "text-expense") : "text-muted-foreground"
            )}
          >
            {formatMoney(loan.remaining)}
          </p>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Figure label="Tiền gốc" value={formatMoney(loan.amount)} />
          <Figure
            label={isLend ? "Đã thu" : "Đã trả"}
            value={`${formatMoney(loan.paid)} · ${Math.round(percent)}%`}
          />
          <Figure
            label={loan.interestRate ? `Lãi tạm tính (${loan.interestRate}%/tháng)` : "Lãi suất"}
            value={loan.interestRate ? formatMoney(loan.interest) : "Không lãi"}
          />
          <Figure label="Ngày phát sinh" value={formatDate(loan.date)} />
        </div>

        {loan.note && (
          <p className="mt-3 rounded-lg bg-sunken p-3 text-sm text-muted-foreground">{loan.note}</p>
        )}
      </div>

      <SectionCard title={`Lịch sử ${isLend ? "thu nợ" : "trả nợ"} (${loan.payments.length})`}>
        {loan.payments.length === 0 ? (
          <EmptyHint>Chưa có lần {isLend ? "thu" : "trả"} nào.</EmptyHint>
        ) : (
          <div className="divide-y divide-border/60">
            {loan.payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <MemberAvatar user={p.createdBy} className="size-8" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{formatDate(p.date)}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.note || p.createdBy.name || p.createdBy.email}
                  </div>
                </div>
                <span className="num shrink-0 text-sm font-bold text-income">
                  +{formatMoney(p.amount)}
                </span>
                <DeletePaymentButton paymentId={p.id} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-sunken px-3 py-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="num truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
