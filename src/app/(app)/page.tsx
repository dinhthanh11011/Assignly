import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CircleHelp,
  HandCoins,
  Scale,
  UserPlus,
  Users,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  ALL_MONTHS,
  getCategoryOptions,
  getGroupBalance,
  getJoinRequestsToReview,
  getLoans,
  getMemberOptions,
  getMonthDayTotals,
  getReport,
  getTransactions,
  getUnknownAmountTransactions,
  scopeWith,
} from "@/lib/queries";
import { dueSentence, loanAge } from "@/lib/copy";
import { currentMonth, formatMoney, formatMonth, monthRange, shiftMonth, todayKey } from "@/lib/utils";
import { NoGroupState } from "@/components/page-shell";
import { LedgerLiveRefresh } from "@/components/ledger-live-refresh";
import { PendingTransactions } from "@/components/pending-transactions";
import { TransactionList, type TransactionItem } from "@/components/transaction-list";
import { WalletCard } from "@/components/home/wallet-card";
import { TodoList, type TodoItem } from "@/components/home/todo-list";
import { CategoryBars } from "@/components/home/category-bars";
import { QuickAddCta } from "@/components/home/quick-add-cta";
import { Amount } from "@/components/ui/amount";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Tổng quan" };

/**
 * TỔNG QUAN — "tình hình mình thế nào, có việc gì cần làm".
 *
 * Trang này từng bị bỏ vì trùng với trang sổ (cùng hero số dư, cùng danh sách).
 * Bản này tránh đúng lỗi đó bằng cách chỉ TÓM TẮT và DẪN ĐI:
 *   · không lịch, không bộ lọc, không danh sách đầy đủ — đó là việc của /ledger;
 *   · khối chính là "Việc cần làm", thứ trước đây rải ở ba trang;
 *   · khối nào cũng có link sang trang chủ của nó.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;
  const sp = await searchParams;

  const month = currentMonth();
  const prevMonth = shiftMonth(month, -1);
  const dayOfMonth = Number(todayKey().slice(8, 10));

  const [{ groupId, groups, data }, joinRequests] = await Promise.all([
    scopeWith(userId, sp.group, (id) =>
      Promise.all([
        getReport(userId, id, monthRange(month)),
        getMonthDayTotals(id, prevMonth),
        getLoans(userId, id, { status: "ACTIVE" }),
        getGroupBalance(userId, id),
        getUnknownAmountTransactions(id),
        getTransactions(userId, id, { month: ALL_MONTHS }, undefined, 5),
        getCategoryOptions(id),
        getMemberOptions(id),
      ])
    ),
    getJoinRequestsToReview(userId),
  ]);
  if (!groupId || !data) return <NoGroupState />;

  const [report, prevDays, loans, balance, unknownAmount, recent, categories, members] = await data;
  if (!report || !recent) return <NoGroupState />;

  const groupName = groups.find((g) => g.id === groupId)?.name ?? "";
  const firstName = session!.user.name?.trim().split(/\s+/).pop();

  // So với tháng trước trong CÙNG số ngày đã trôi qua: ngày 6 mà so với cả
  // tháng trước thì tháng nào cũng "giảm 80%".
  const prevExpenseToDate = prevDays
    .filter((d) => Number(d.day.slice(8, 10)) <= dayOfMonth)
    .reduce((s, d) => s + d.expense, 0);
  const dailyExpense = report.series.slice(0, dayOfMonth).map((p) => p.expense);

  // ── Việc cần làm ────────────────────────────────────────────────────────
  const todos: TodoItem[] = [];
  for (const l of (loans ?? []).filter((l) => l.attention).slice(0, 3)) {
    const lend = l.type === "LEND";
    todos.push({
      key: `loan-${l.id}`,
      href: `/loans/${l.id}`,
      icon: CalendarClock,
      tone: l.overdue ? "expense" : "warning",
      title: lend
        ? `${l.counterparty} còn nợ bạn ${formatMoney(l.remaining)}`
        : `Bạn còn nợ ${l.counterparty} ${formatMoney(l.remaining)}`,
      detail: l.stale ? `Chưa động tới ${loanAge(l.idleDays).replace("đã ", "")}` : dueSentence(l.daysToDue),
    });
  }
  if (balance && balance.memberCount > 1) {
    for (const t of balance.transfers.filter((t) => t.fromUserId === userId || t.toUserId === userId)) {
      const pay = t.fromUserId === userId;
      const other = pay ? t.to : t.from;
      const name = other.name ?? other.email ?? "Một thành viên";
      todos.push({
        key: `settle-${t.fromUserId}-${t.toUserId}`,
        href: "/loans?view=shared",
        icon: Scale,
        tone: pay ? "expense" : "income",
        title: pay ? `Đưa ${name} ${formatMoney(t.amount)}` : `${name} cần đưa bạn ${formatMoney(t.amount)}`,
        detail: "Cân đối tiền chi chung của sổ",
      });
    }
  }
  if (unknownAmount.length > 0) {
    todos.push({
      key: "unknown",
      href: "/ledger",
      icon: CircleHelp,
      tone: "warning",
      title: `${unknownAmount.length} khoản chưa điền số tiền`,
      detail: "Điền vào để tổng tháng đúng",
    });
  }
  for (const r of joinRequests) {
    todos.push({
      key: `join-${r.id}`,
      href: `/groups/${r.groupId}#join-requests`,
      icon: UserPlus,
      tone: "primary",
      title: `${r.user.name ?? r.user.email ?? "Ai đó"} xin vào sổ “${r.group.name}”`,
      detail: "Duyệt hoặc từ chối",
    });
  }

  const receivable = report.receivable;
  const payable = report.payable;
  const topCategories = report.expenseByCategory.slice(0, 5);
  const brandNew = recent.items.length === 0;

  return (
    <div className="space-y-8">
      <LedgerLiveRefresh groupId={groupId} />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body text-muted-foreground">{groupName}</p>
          <h1 className="text-page">{firstName ? `Chào ${firstName}` : "Tổng quan"}</h1>
        </div>
      </header>

      {brandNew ? (
        <EmptyState
          icon={HandCoins}
          title="Sổ còn trống"
          action={
            <>
              <QuickAddCta label="Ghi khoản đầu tiên" />
              {members.length < 2 && (
                <Button asChild variant="outline">
                  <Link href={`/groups/${groupId}`}>
                    <Users aria-hidden /> Mời người cùng ghi
                  </Link>
                </Button>
              )}
            </>
          }
        >
          Ghi một khoản tiền vào hoặc tiền ra để bắt đầu. Mọi con số ở trang này sẽ tự cập nhật.
        </EmptyState>
      ) : (
                // Điện thoại: một cột, việc cần làm ngay sau thẻ ví (thứ tự = mức quan
        // trọng). Desktop: hai cột — cột trái là con số, cột phải là việc.
        // Hai cột dùng `contents` ở màn hẹp để các khối con xếp theo `order`.
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
          <div className="contents lg:block lg:space-y-8">
            <WalletCard
              monthLabel={formatMonth(month)}
              income={report.totalIncome}
              expense={report.totalExpense}
              prevExpense={prevExpenseToDate}
              dailyExpense={dailyExpense}
              href="/ledger"
              className="order-1"
            />

            <section aria-labelledby="recent-title" className="order-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 id="recent-title" className="text-title">
                  Gần đây
                </h2>
                <Link
                  href="/ledger"
                  className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-label text-primary hover:underline"
                >
                  Xem tất cả <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              <TransactionList
                groupId={groupId}
                categories={categories}
                members={members}
                currentUserId={userId}
                items={recent.items as unknown as TransactionItem[]}
                nextCursor={null}
                filter={{ month: ALL_MONTHS }}
                announceCount={false}
              />
            </section>
          </div>

          <div className="contents lg:block lg:space-y-8">
            <TodoList
              className="order-2"
              items={todos}
              extra={
                <PendingTransactions
                  groupId={groupId}
                  categories={categories}
                  members={members}
                  currentUserId={userId}
                />
              }
            />

            {(receivable > 0 || payable > 0) && (
              <section aria-labelledby="debt-title" className="order-4 space-y-3">
                <h2 id="debt-title" className="text-title">
                  Nợ
                </h2>
                <Link
                  href="/loans"
                  className="focus-ring grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border transition-colors @container sm:grid-cols-2"
                >
                  <span className="bg-card px-4 py-3.5 transition-colors hover:bg-sunken">
                    <span className="block text-caption text-muted-foreground">Người ta nợ bạn</span>
                    <Amount value={receivable} tone="income" size="lg" />
                  </span>
                  <span className="bg-card px-4 py-3.5 transition-colors hover:bg-sunken">
                    <span className="block text-caption text-muted-foreground">Bạn nợ người ta</span>
                    <Amount value={payable} tone="expense" size="lg" />
                  </span>
                </Link>
              </section>
            )}

            {topCategories.length > 0 && (
              <section aria-labelledby="cat-title" className="order-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="cat-title" className="text-title">
                    Chi nhiều nhất tháng này
                  </h2>
                  <Link
                    href="/reports"
                    className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-label text-primary hover:underline"
                  >
                    Báo cáo <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <CategoryBars items={topCategories} total={report.totalExpense} />
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
