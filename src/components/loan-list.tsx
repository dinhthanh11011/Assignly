import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { LoanCard, type LoanCardData } from "@/components/loan-card";
import { Amount } from "@/components/ui/amount";
import { CounterpartyAvatar, LoanStatusBadge } from "@/components/loans/loan-bits";
import { loanDirectionHeading } from "@/lib/copy";
import { rowClass } from "@/components/ui/row";

type Loan = LoanCardData & { paymentCount: number };

/**
 * Danh sách khoản đang nợ: "Cần chú ý" (trễ hẹn, sắp tới hẹn, để yên quá lâu)
 * lên đầu dạng hàng gọn — đó là việc phải làm; rồi hai nhóm theo CHIỀU, vì "ai
 * nợ ai" là câu hỏi người dùng mở trang này để trả lời.
 */
export function LoanList({ loans, attention }: { loans: Loan[]; attention: Loan[] }) {
  const lend = loans.filter((l) => l.type === "LEND");
  const borrow = loans.filter((l) => l.type === "BORROW");

  return (
    <div className="space-y-8">
      {attention.length > 0 && (
        <section aria-labelledby="can-chu-y" className="space-y-3">
          <h2 id="can-chu-y" className="flex items-center gap-2 text-title">
            <TriangleAlert className="size-5 shrink-0 text-warning" aria-hidden />
            Cần chú ý
            <span className="text-body font-normal text-muted-foreground">· {attention.length} khoản</span>
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {attention.map((l) => (
              <li key={l.id}>
                <Link href={`/loans/${l.id}`} className={`${rowClass()} flex-wrap gap-y-2`}>
                  <span className="flex min-w-0 flex-[1_1_12rem] items-center gap-3">
                    <CounterpartyAvatar name={l.counterparty} type={l.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-lg">{l.counterparty}</span>
                      <span className="block">
                        <LoanStatusBadge
                          status={l.status}
                          dueDate={l.dueDate}
                          overdue={l.overdue}
                          stale={l.stale}
                          idleDays={l.idleDays}
                        />
                      </span>
                    </span>
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-2">
                    <Amount
                      value={l.type === "LEND" ? l.remaining : -l.remaining}
                      tone={l.type === "LEND" ? "income" : "expense"}
                    />
                    <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DirectionSection type="LEND" loans={lend} />
      <DirectionSection type="BORROW" loans={borrow} />
    </div>
  );
}

function DirectionSection({ type, loans }: { type: "LEND" | "BORROW"; loans: Loan[] }) {
  if (loans.length === 0) return null;
  const id = type === "LEND" ? "ho-no-ban" : "ban-no-ho";
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 space-y-3">
      <h2 id={`${id}-title`} className="text-title">
        {loanDirectionHeading(type)}
        <span className="text-body font-normal text-muted-foreground"> · {loans.length} khoản</span>
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {loans.map((loan) => (
          <LoanCard key={loan.id} loan={loan} paymentCount={loan.paymentCount} />
        ))}
      </div>
    </section>
  );
}
