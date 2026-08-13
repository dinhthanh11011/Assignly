import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { MemberSpendList } from "@/components/member-spend-list";
import { getSession } from "@/lib/auth";
import { getReport, scopeWith } from "@/lib/queries";
import { rangeLabel, resolveRange, type ReportRange } from "@/lib/range";
import { ReportRangePicker } from "@/components/report-range";
import { CashflowChart, CategoryBars, CategoryPie } from "@/components/report-charts";
import {
  BalanceHero,
  NoGroupState,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/page-shell";
import { ChartCardSkeleton, HeroSkeleton, StatsSkeleton } from "@/components/skeletons";
import { dateFromKey, formatMoney } from "@/lib/utils";

export const metadata = { title: "Báo cáo" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    range?: string;
    month?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;
  const sp = await searchParams;

  // Ba kiểu chọn khoảng (từng tháng / N tháng gần đây / tự chọn ngày) đều quy về
  // một khoảng ngày duy nhất — xem `@/lib/range`.
  const range = resolveRange(sp);

  // Báo cáo phải quét cả khoảng khoản nên đây là truy vấn nặng nhất app.
  // Không giữ cả trang lại chờ nó: tiêu đề + bộ chọn hiện ngay, phần số liệu
  // stream vào sau (xem <ReportBody/>).
  const { groupId, data } = await scopeWith(userId, sp.group, (id) =>
    getReport(userId, id, { from: dateFromKey(range.from), until: dateFromKey(range.until) })
  );
  if (!groupId || !data) return <NoGroupState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Báo cáo" subtitle="Khoảng thời gian này tiêu vào những việc gì" />

      <Suspense>
        <ReportRangePicker range={range} />
      </Suspense>

      {/* `key` đổi theo sổ/khoảng thời gian để đổi bộ lọc là thấy khung xương
          ngay, thay vì giữ nguyên số cũ rồi mới nhảy sang số mới. */}
      <Suspense key={`${groupId}-${range.from}-${range.until}`} fallback={<ReportSkeleton />}>
        <ReportBody data={data} range={range} />
      </Suspense>
    </div>
  );
}

async function ReportBody({
  data,
  range,
}: {
  data: Promise<Awaited<ReturnType<typeof getReport>>>;
  range: ReportRange;
}) {
  const report = await data;
  if (!report) return <NoGroupState />;

  const byDay = report.granularity === "day";
  // Khoảng ngắn thì "mỗi tháng tiêu khoảng…" là câu vô nghĩa (chưa đủ một tháng
  // để lấy trung bình), nên đổi sang mức ngày.
  const average = byDay
    ? Math.round(report.totalExpense / report.days)
    : Math.round(report.totalExpense / report.monthCount);

  return (
    <div className="space-y-6">
      <BalanceHero
        label={rangeLabel(range)}
        balance={report.balance}
        income={report.totalIncome}
        expense={report.totalExpense}
        footer={
          <span className="num text-muted-foreground">
            {byDay ? "Mỗi ngày" : "Mỗi tháng"} tiêu khoảng {formatMoney(average)}
          </span>
        }
      />

      {/* Hai ô nợ này nói về CHUYỆN CHO MƯỢN (bảng Loan) — không phải tiền cả nhà
          cùng chi. Bản trước chỉ ghi "Người ta còn nợ bạn", đọc lên không biết là
          nợ nào, mà app có đúng hai loại nợ rất khác nhau. Nên: nói rõ nguồn ngay
          trong nhãn, nói rõ nó KHÔNG theo khoảng đang xem, và có đường sang trang
          Nợ để xem từng khoản.

          Cố ý tính toàn thời gian: một khoản cho mượn từ năm ngoái mà chưa trả thì
          hôm nay vẫn là nợ — bó nó theo khoảng đang xem sẽ ra số 0 dối. */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-label text-muted-foreground">
            Chuyện cho mượn — tính tất cả từ trước tới nay, không riêng khoảng này
          </h2>
          <Button variant="link" size="sm" asChild>
            <Link href="/loans">Xem từng khoản mượn</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            icon={ArrowUpRight}
            tone="income"
            label="Bạn cho mượn, chưa lấy lại"
            value={formatMoney(report.receivable)}
            hint="Cộng các khoản bạn cho người khác mượn"
          />
          <StatCard
            icon={ArrowDownLeft}
            tone="warning"
            label="Bạn đi mượn, chưa trả"
            value={formatMoney(report.payable)}
            hint="Cộng các khoản bạn mượn của người khác"
          />
        </div>
      </div>

      {/* Tiền CẢ NHÀ cùng chi, bó đúng theo khoảng đang xem — nửa còn lại của câu
          hỏi "tiền đi đâu", mà bốn biểu đồ theo danh mục không trả lời được. Sổ
          một người thì bỏ hẳn: "ai chi" khi chỉ có một người là câu hỏi rỗng. */}
      {report.memberCount > 1 && (
        <SectionCard title={`Ai bỏ tiền ra trong ${rangeLabel(range).toLowerCase()}`}>
          <MemberSpendList rows={report.byMember} totalExpense={report.totalExpense} />
        </SectionCard>
      )}

      <SectionCard
        title={byDay ? "Mỗi ngày vào bao nhiêu, ra bao nhiêu" : "Mỗi tháng vào bao nhiêu, ra bao nhiêu"}
      >
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
    <div className="space-y-6">
      <HeroSkeleton />
      <StatsSkeleton count={2} />
      <ChartCardSkeleton height="h-40" />
      <ChartCardSkeleton height="h-64" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
      <ChartCardSkeleton height="h-40" />
    </div>
  );
}
