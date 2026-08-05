import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGroupOptions, getTransactions, resolveGroupId } from "@/lib/queries";
import { FilterChips, GroupPicker, MonthPicker } from "@/components/scope-picker";
import { AddTransactionButton } from "@/components/transaction-dialog";
import { TransactionList, type TransactionItem } from "@/components/transaction-list";
import { BalanceHero, NoGroupState, PageHeader } from "@/components/page-shell";
import { currentMonth, formatMonth } from "@/lib/utils";

export const metadata = { title: "Giao dịch" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; month?: string; type?: string; category?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const sp = await searchParams;

  const groupId = await resolveGroupId(userId, sp.group);
  if (!groupId) return <NoGroupState />;

  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : currentMonth();
  const type =
    sp.type === "INCOME"
      ? ("INCOME" as const)
      : sp.type === "EXPENSE"
        ? ("EXPENSE" as const)
        : undefined;
  const filter = { month, type, categoryId: sp.category };

  const [groups, page, categories] = await Promise.all([
    getGroupOptions(userId),
    getTransactions(userId, groupId, filter),
    prisma.category.findMany({
      where: { groupId },
      select: { id: true, name: true, icon: true, type: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!page) return <NoGroupState />;

  const categoryOptions = [
    { value: "", label: "Mọi danh mục" },
    ...categories
      .filter((c) => !type || c.type === type)
      .map((c) => ({ value: c.id, label: `${c.icon ?? "📁"} ${c.name}` })),
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Giao dịch" subtitle={formatMonth(month)}>
        <Suspense>
          <GroupPicker groups={groups} current={groupId} />
        </Suspense>
        <Suspense>
          <MonthPicker month={month} />
        </Suspense>
        <AddTransactionButton groupId={groupId} categories={categories} />
      </PageHeader>

      <BalanceHero
        label={`Chênh lệch ${formatMonth(month).toLowerCase()}`}
        balance={page.balance}
        income={page.income}
        expense={page.expense}
      />

      <div className="space-y-2">
        <Suspense>
          <FilterChips
            param="type"
            value={type ?? ""}
            options={[
              { value: "", label: "Tất cả" },
              { value: "EXPENSE", label: "Khoản chi" },
              { value: "INCOME", label: "Khoản thu" },
            ]}
          />
        </Suspense>
        {categoryOptions.length > 1 && (
          <Suspense>
            <FilterChips param="category" value={sp.category ?? ""} options={categoryOptions} />
          </Suspense>
        )}
      </div>

      <TransactionList
        groupId={groupId}
        categories={categories}
        items={page.items as unknown as TransactionItem[]}
        nextCursor={page.nextCursor}
        filter={filter}
        emptyText={`Chưa có giao dịch nào trong ${formatMonth(month).toLowerCase()}.`}
      />
    </div>
  );
}
