import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { getReport, scopeWith } from "@/lib/queries";
import { FilterChips } from "@/components/scope-picker";
import { CashflowChart, CategoryBars, CategoryPie } from "@/components/report-charts";
import {
  BalanceHero,
  NoGroupState,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/page-shell";
import { ChartCardSkeleton, HeroSkeleton, StatsSkeleton } from "@/components/skeletons";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Xem lại" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; range?: string }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;
  const sp = await searchParams;

  const months = sp.range === "3" || sp.range === "12" ? Number(sp.range) : 6;

  // Báo cáo phải quét tới 12 tháng khoản nên đây là truy vấn nặng nhất app.
  // Không giữ cả trang lại chờ nó: tiêu đề + bộ lọc hiện ngay, phần số liệu
  // stream vào sau (xem <ReportBody/>).
  const { groupId, data } = await scopeWith(userId, sp.group, (id) =>
    getReport(userId, id, months)
  );
  if (!groupId || !data) return <NoGroupState />;

  return (
    <div className="space-y-5">
      <PageHeader title="Xem lại" subtitle="Mấy tháng qua tiêu vào những việc gì" />

      <Suspense>
        <FilterChips
          param="range"
          value={String(months)}
          options={[
            { value: "3", label: "3 tháng gần đây" },
            { value: "6", label: "6 tháng" },
            { value: "12", label: "12 tháng" },
          ]}
        />
      </Suspense>

      {/* `key` đổi theo sổ/khoảng thời gian để đổi bộ lọc là thấy khung xương
          ngay, thay vì giữ nguyên số cũ rồi mới nhảy sang số mới. */}
      <Suspense key={`${groupId}-${months}`} fallback={<ReportSkeleton />}>
        <ReportBody data={data} months={months} />
      </Suspense>
    </div>
  );
}

async function ReportBody({
  data,
  months,
}: {
  data: Promise<Awaited<ReturnType<typeof getReport>>>;
  months: number;
}) {
  const report = await data;
  if (!report) return <NoGroupState />;

  const avgExpense = Math.round(report.totalExpense / months);

  return (
    <div className="space-y-5">
      <BalanceHero
        label={`${months} tháng gần đây`}
        balance={report.balance}
        income={report.totalIncome}
        expense={report.totalExpense}
        footer={
          <span className="num text-muted-foreground">
            Mỗi tháng tiêu khoảng {formatMoney(avgExpense)}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon={ArrowUpRight}
          tone="income"
          label="Người ta còn nợ bạn"
          value={formatMoney(report.receivable)}
        />
        <StatCard
          icon={ArrowDownLeft}
          tone="warning"
          label="Bạn còn nợ người ta"
          value={formatMoney(report.payable)}
        />
      </div>

      <SectionCard title="Mỗi tháng vào bao nhiêu, ra bao nhiêu">
        <CashflowChart data={report.series} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Tiêu vào những việc gì">
          <CategoryPie data={report.expenseByCategory} />
        </SectionCard>
        <SectionCard title="Tiêu nhiều nhất cho việc gì">
          <CategoryBars data={report.expenseByCategory} />
        </SectionCard>
      </div>

      <SectionCard title="Tiền vào từ đâu">
        <CategoryBars data={report.incomeByCategory} />
      </SectionCard>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-5">
      <HeroSkeleton />
      <StatsSkeleton count={2} />
      <ChartCardSkeleton height="h-64" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
      <ChartCardSkeleton height="h-40" />
    </div>
  );
}
