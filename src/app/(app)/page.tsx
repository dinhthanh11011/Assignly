import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ArrowUpRight, ArrowDownLeft, ChevronRight, Scale } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getGroupBalance,
  getGroupOptions,
  getMemberOptions,
  getOverview,
  resolveGroupId,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GroupPicker, MonthPicker } from "@/components/scope-picker";
import { AddTransactionButton } from "@/components/transaction-dialog";
import { DueLabel } from "@/components/loan-card";
import { LoanPaymentButton } from "@/components/loan-payment-dialog";
import {
  BalanceHero,
  EmptyHint,
  NoGroupState,
  PageHeader,
  SectionCard,
} from "@/components/page-shell";
import { cn, currentMonth, formatDate, formatMoney, formatMonth } from "@/lib/utils";

export const metadata = { title: "Tổng quan" };

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; month?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { group, month: monthParam } = await searchParams;

  const groupId = await resolveGroupId(userId, group);
  if (!groupId) return <NoGroupState />;

  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "") ? monthParam! : currentMonth();
  const [groups, overview, categories, members, balance] = await Promise.all([
    getGroupOptions(userId),
    getOverview(userId, groupId, month),
    prisma.category.findMany({
      where: { groupId },
      select: { id: true, name: true, icon: true, type: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    getMemberOptions(groupId),
    getGroupBalance(userId, groupId),
  ]);
  if (!overview) return <NoGroupState />;

  const topExpense = overview.expenseByCategory.slice(0, 5);
  const maxExpense = topExpense[0]?.value ?? 0;
  const totalExpense = overview.expense || 1;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Chào ${session!.user.name?.split(" ").slice(-1)[0] ?? "bạn"} 👋`}
        subtitle={formatDate(new Date())}
      >
        <Suspense>
          <GroupPicker groups={groups} current={groupId} />
        </Suspense>
        <Suspense>
          <MonthPicker month={month} />
        </Suspense>
        <AddTransactionButton
          groupId={groupId}
          categories={categories}
          members={members}
          currentUserId={userId}
        />
      </PageHeader>

      <BalanceHero
        label={`Số dư ${formatMonth(month).toLowerCase()}`}
        balance={overview.balance}
        income={overview.income}
        expense={overview.expense}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 text-white/85">
            <span>
              {overview.balance >= 0
                ? "Tháng này bạn đang thu nhiều hơn chi 🎉"
                : "Tháng này chi đang vượt thu ⚠️"}
            </span>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1 font-semibold text-white hover:underline"
            >
              Xem giao dịch <ArrowRight className="size-3.5" />
            </Link>
          </div>
        }
      />

      {/* Hai ô nợ: dẫn thẳng sang danh sách đã lọc đúng chiều */}
      <div className="grid gap-3 sm:grid-cols-2">
        <DebtTile
          href="/loans?type=LEND"
          icon={ArrowUpRight}
          label="Còn phải thu"
          value={overview.receivable}
          tone="income"
        />
        <DebtTile
          href="/loans?type=BORROW"
          icon={ArrowDownLeft}
          label="Còn phải trả"
          value={overview.payable}
          tone="warning"
        />
      </div>

      {/* Sổ nhiều người: nhắc ngay mình đang nợ hay được nợ bao nhiêu trong nhóm */}
      {balance && balance.memberCount > 1 && (
        <Link
          href="/balance"
          className="group flex items-center gap-3.5 rounded-xl border border-hairline bg-card p-4 shadow-soft transition-shadow hover:shadow-lift"
        >
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-md",
              !balance.me || balance.me.net === 0
                ? "bg-primary/12 text-primary"
                : balance.me.net > 0
                  ? "bg-income/12 text-income"
                  : "bg-expense/12 text-expense"
            )}
          >
            <Scale className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">
              {!balance.me || balance.me.net === 0
                ? "Cân đối với nhóm"
                : balance.me.net > 0
                  ? "Nhóm còn nợ bạn"
                  : "Bạn còn nợ nhóm"}
            </div>
            <div className="num truncate text-[17px] font-bold">
              {!balance.me || balance.me.net === 0
                ? "Đã cân bằng 🎉"
                : formatMoney(Math.abs(balance.me.net))}
            </div>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {overview.dueSoon.length > 0 && (
        <SectionCard
          title="Nợ sắp đến hạn"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/loans">
                Tất cả <ChevronRight className="size-4" />
              </Link>
            </Button>
          }
        >
          <div className="space-y-2">
            {overview.dueSoon.map((loan) => (
              <div
                key={loan.id}
                className="flex flex-wrap items-center gap-3 rounded-lg bg-sunken px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/loans/${loan.id}`}
                      className="truncate text-sm font-semibold hover:text-primary"
                    >
                      {loan.counterparty}
                    </Link>
                    <Badge variant={loan.type === "LEND" ? "income" : "warning"}>
                      {loan.type === "LEND" ? "Cần thu" : "Cần trả"}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="num-lg text-xs font-bold">
                      {formatMoney(loan.remaining)}
                    </span>
                    {loan.dueDate && <DueLabel dueDate={loan.dueDate} overdue={loan.overdue} />}
                  </div>
                </div>
                <LoanPaymentButton
                  loanId={loan.id}
                  type={loan.type}
                  counterparty={loan.counterparty}
                  remaining={loan.remaining}
                  variant="soft"
                  size="sm"
                />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Chi nhiều nhất trong tháng">
          {topExpense.length === 0 ? (
            <EmptyHint>Chưa có khoản chi nào trong tháng này.</EmptyHint>
          ) : (
            <div className="space-y-3.5">
              {topExpense.map((c) => (
                <div key={c.name}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">
                      <span className="mr-1.5">{c.icon ?? "📦"}</span>
                      {c.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {Math.round((c.value / totalExpense) * 100)}%
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-accent))]"
                        style={{ width: `${maxExpense ? (c.value / maxExpense) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="num-lg shrink-0 text-xs font-bold">
                      {formatMoney(c.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Giao dịch gần đây"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/transactions">
                Tất cả <ChevronRight className="size-4" />
              </Link>
            </Button>
          }
        >
          {overview.recent.length === 0 ? (
            <EmptyHint>Chưa có giao dịch nào. Bấm “Ghi giao dịch” để bắt đầu.</EmptyHint>
          ) : (
            <div className="divide-y divide-border/60">
              {overview.recent.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md text-base",
                      t.type === "INCOME" ? "bg-income/10" : "bg-sunken"
                    )}
                  >
                    {t.category?.icon ?? (t.type === "INCOME" ? "💵" : "📦")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {t.category?.name ?? "Chưa phân loại"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatDate(t.date)}
                      {t.note ? ` · ${t.note}` : ""}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "num-lg shrink-0 text-sm font-bold",
                      t.type === "INCOME" ? "text-income" : "text-foreground"
                    )}
                  >
                    {t.type === "INCOME" ? "+" : "−"}
                    {formatMoney(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function DebtTile({
  href,
  icon: Icon,
  label,
  value,
  tone,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  value: number;
  tone: "income" | "warning";
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 rounded-xl border border-hairline bg-card p-4 shadow-soft transition-shadow hover:shadow-lift"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md",
          tone === "income" ? "bg-income/12 text-income" : "bg-warning/18 text-warning"
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="num truncate text-[17px] font-bold">{formatMoney(value)}</div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
