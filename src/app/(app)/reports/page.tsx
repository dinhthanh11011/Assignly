import { Suspense } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGroupOptions, getReport, resolveGroupId } from "@/lib/queries";
import { FilterChips, GroupPicker } from "@/components/scope-picker";
import { CashflowChart, CategoryBars, CategoryPie } from "@/components/report-charts";
import {
  BalanceHero,
  NoGroupState,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/page-shell";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Báo cáo" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; range?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const sp = await searchParams;

  const groupId = await resolveGroupId(userId, sp.group);
  if (!groupId) return <NoGroupState />;

  const months = sp.range === "3" || sp.range === "12" ? Number(sp.range) : 6;
  const [groups, report] = await Promise.all([
    getGroupOptions(userId),
    getReport(userId, groupId, months),
  ]);
  if (!report) return <NoGroupState />;

  const avgExpense = Math.round(report.totalExpense / months);

  return (
    <div className="space-y-5">
      <PageHeader title="Báo cáo" subtitle={`${months} tháng gần nhất`}>
        <Suspense>
          <GroupPicker groups={groups} current={groupId} />
        </Suspense>
      </PageHeader>

      <Suspense>
        <FilterChips
          param="range"
          value={String(months)}
          options={[
            { value: "3", label: "3 tháng" },
            { value: "6", label: "6 tháng" },
            { value: "12", label: "12 tháng" },
          ]}
        />
      </Suspense>

      <BalanceHero
        label={`Chênh lệch ${months} tháng`}
        balance={report.balance}
        income={report.totalIncome}
        expense={report.totalExpense}
        footer={
          <span className="num text-white/85">
            Chi trung bình {formatMoney(avgExpense)} / tháng
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={ArrowUpRight}
          tone="income"
          label="Còn phải thu (cho vay)"
          value={formatMoney(report.receivable)}
        />
        <StatCard
          icon={ArrowDownLeft}
          tone="warning"
          label="Còn phải trả (đi vay)"
          value={formatMoney(report.payable)}
        />
      </div>

      <SectionCard title="Dòng tiền theo tháng">
        <CashflowChart data={report.series} />
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Cơ cấu chi tiêu">
          <CategoryPie data={report.expenseByCategory} />
        </SectionCard>
        <SectionCard title="Chi nhiều nhất theo danh mục">
          <CategoryBars data={report.expenseByCategory} />
        </SectionCard>
      </div>

      <SectionCard title="Nguồn thu">
        <CategoryBars data={report.incomeByCategory} />
      </SectionCard>
    </div>
  );
}
