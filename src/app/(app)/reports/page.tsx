import Link from "next/link";
import { Suspense } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChartNoAxesColumn, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getPeriodTotals, getReport, scopeWith } from "@/lib/queries";
import {
  periodLabel,
  previousRange,
  rangeLabel,
  resolveRange,
  type ReportRange,
} from "@/lib/range";
import { ReportRangePicker } from "@/components/report-range";
import {
  CashflowChart,
  CategoryBarList,
  CategoryDonut,
  ChartPanel,
  DataTable,
} from "@/components/report-charts";
import { foldSlices, pointHeading } from "@/components/reports/chart-data";
import { MemberSpendList, memberSpendTable } from "@/components/member-spend-list";
import { NoGroupState, PageHeader } from "@/components/page-shell";
import { QuickAddCta } from "@/components/quick-add-cta";
import { Amount } from "@/components/ui/amount";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { ReportBodySkeleton } from "@/components/reports/report-skeleton";
import { dateFromKey, formatDate, formatMoney } from "@/lib/utils";
import { LedgerLiveRefresh } from "@/components/ledger-live-refresh";

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

  // Ba kiểu chọn khoảng đều quy về một khoảng ngày — xem `@/lib/range`.
  const range = resolveRange(sp);
  const prev = previousRange(range);

  // Báo cáo là truy vấn nặng nhất app: tiêu đề + bộ chọn hiện ngay, số liệu
  // stream vào sau.
  const { groupId, data } = await scopeWith(userId, sp.group, (id) =>
    Promise.all([
      getReport(userId, id, { from: dateFromKey(range.from), until: dateFromKey(range.until) }),
      prev
        ? getPeriodTotals(userId, id, { from: dateFromKey(prev.from), until: dateFromKey(prev.until) })
        : Promise.resolve(null),
    ])
  );
  if (!groupId || !data) return <NoGroupState />;

  return (
    <div className="space-y-6">
      <LedgerLiveRefresh groupId={groupId} />
      <PageHeader title="Báo cáo" subtitle="Tiền vào, tiền ra và tiêu vào những việc gì" />

      <Suspense>
        <ReportRangePicker range={range} />
      </Suspense>

      {/* `key` đổi theo sổ/khoảng để đổi bộ lọc là thấy khung xương ngay. */}
      <Suspense key={`${groupId}-${range.from}-${range.until}`} fallback={<ReportBodySkeleton />}>
        <ReportBody data={data} range={range} prev={prev} />
      </Suspense>
    </div>
  );
}

/** Tỉ lệ thay đổi so với kỳ trước; null khi kỳ trước bằng 0 (không chia được). */
function change(now: number, before: number | undefined) {
  if (before === undefined || before === 0) return null;
  return (now - before) / Math.abs(before);
}

async function ReportBody({
  data,
  range,
  prev,
}: {
  data: Promise<[Awaited<ReturnType<typeof getReport>>, Awaited<ReturnType<typeof getPeriodTotals>>]>;
  range: ReportRange;
  prev: ReturnType<typeof previousRange>;
}) {
  const [report, before] = await data;
  if (!report) return <NoGroupState />;

  const label = rangeLabel(range);
  const empty = report.totalIncome === 0 && report.totalExpense === 0;
  const byDay = report.granularity === "day";
  const average = byDay
    ? Math.round(report.totalExpense / report.days)
    : Math.round(report.totalExpense / report.monthCount);
  const prevBalance = before ? before.income - before.expense : undefined;
  const compared = before && before.count > 0;

  const expense = foldSlices(report.expenseByCategory);
  const income = foldSlices(report.incomeByCategory);
  const shared = report.memberCount > 1;

  return (
    <div className="space-y-6">
      {empty ? (
        <EmptyState
          icon={ChartNoAxesColumn}
          title={`${label} chưa có khoản nào`}
          action={<QuickAddCta label="Ghi khoản" />}
        >
          Ghi một khoản tiền vào hoặc tiền ra là biểu đồ ở đây tự hiện. Hoặc chọn một khoảng thời gian
          khác ở trên.
        </EmptyState>
      ) : (
        <>
          <section aria-label="Tổng quan khoảng này" className="space-y-2 @container">
            {/* Ngưỡng theo em của CHÍNH khối này: ở "Chữ lớn" ba ô tự xuống thành
                một cột thay vì cắt con số. */}
            <div className="grid grid-cols-1 gap-3 @min-[40em]:grid-cols-3">
              <Stat
                label="Thu"
                icon={ArrowDownLeft}
                value={<Amount value={report.totalIncome} tone="income" size="lg" />}
                delta={compared ? change(report.totalIncome, before?.income) : null}
                goodWhen="up"
              />
              <Stat
                label="Chi"
                icon={ArrowUpRight}
                value={<Amount value={-report.totalExpense} tone="expense" size="lg" />}
                delta={compared ? change(report.totalExpense, before?.expense) : null}
                goodWhen="down"
                hint={`${byDay ? "Mỗi ngày" : "Mỗi tháng"} chi khoảng ${formatMoney(average)}`}
              />
              <Stat
                label="Còn lại"
                icon={Wallet}
                value={<Amount value={report.balance} size="lg" />}
                delta={compared ? change(report.balance, prevBalance) : null}
                goodWhen="up"
              />
            </div>
            {prev && (
              <p className="px-1 text-caption text-muted-foreground">
                {compared
                  ? `Kỳ trước để so: ${periodLabel(prev)}${prev.partial ? " (cùng số ngày)" : ""}`
                  : `Kỳ trước (${periodLabel(prev)}) chưa có khoản nào để so.`}
              </p>
            )}
          </section>

          <ChartPanel
            id="cashflow"
            title="Dòng tiền"
            subtitle={byDay ? "Thu và chi cộng dồn qua từng ngày" : "Thu và chi theo từng tháng"}
            table={
              <DataTable
                caption={`Thu và chi theo ${byDay ? "ngày" : "tháng"}, ${label}`}
                head={[byDay ? "Ngày" : "Tháng", "Tiền vào", "Tiền ra", "Chênh lệch"]}
                rows={report.series
                  .filter((p) => p.income > 0 || p.expense > 0)
                  .map((p) => [
                    p.key.length > 7 ? formatDate(p.key) : pointHeading(p),
                    formatMoney(p.income),
                    formatMoney(p.expense),
                    signed(p.income - p.expense),
                  ])}
                foot={[
                  "Cộng",
                  formatMoney(report.totalIncome),
                  formatMoney(report.totalExpense),
                  signed(report.balance),
                ]}
              />
            }
          >
            <CashflowChart
              data={report.series}
              granularity={report.granularity}
              summary={`Biểu đồ thu chi ${label}: vào ${formatMoney(report.totalIncome)}, ra ${formatMoney(report.totalExpense)}. Bấm "Xem dạng bảng" để đọc từng ${byDay ? "ngày" : "tháng"}.`}
            />
          </ChartPanel>

          <ChartPanel
            id="expense-cats"
            title="Tiêu vào những việc gì"
            subtitle={
              expense.rows.length > 0
                ? `${expense.rows.length} loại · nhiều nhất là ${expense.rows[0].name}`
                : undefined
            }
            table={categoryTable("Chi theo loại", expense.rows, report.totalExpense)}
          >
            {expense.rows.length === 0 ? (
              <EmptyState size="inline">Khoảng này chưa có khoản chi nào.</EmptyState>
            ) : (
              <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
                {expense.rows.length >= 2 ? (
                  <CategoryDonut
                    slices={expense.slices}
                    total={report.totalExpense}
                    summary={`Biểu đồ vòng chi theo loại: ${expense.slices
                      .map((s) => `${s.name} ${Math.round((s.value / report.totalExpense) * 100)}%`)
                      .join(", ")}.`}
                  />
                ) : null}
                <div className={expense.rows.length < 2 ? "md:col-span-2" : undefined}>
                  <CategoryBarList rows={expense.rows} total={report.totalExpense} />
                </div>
              </div>
            )}
          </ChartPanel>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <ChartPanel
              id="income-cats"
              title="Tiền vào từ đâu"
              table={categoryTable("Thu theo loại", income.rows, report.totalIncome)}
            >
              {income.rows.length === 0 ? (
                <EmptyState size="inline">Khoảng này chưa có khoản thu nào.</EmptyState>
              ) : (
                <CategoryBarList rows={income.rows} total={report.totalIncome} limit={6} />
              )}
            </ChartPanel>

            {shared && (
              <ChartPanel
                id="members"
                title="Ai bỏ tiền ra"
                subtitle="Tiền chi chung trong khoảng này: ai trả, phần ai chịu"
                table={memberSpendTable(report.byMember, label)}
              >
                <MemberSpendList rows={report.byMember} totalExpense={report.totalExpense} />
              </ChartPanel>
            )}
          </div>
        </>
      )}

      {/* Nợ tính TOÀN THỜI GIAN, không theo khoảng đang xem: khoản cho mượn từ
          năm ngoái mà chưa trả thì hôm nay vẫn là nợ. */}
      {(report.receivable > 0 || report.payable > 0) && (
        <section aria-labelledby="loans-title" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <h2 id="loans-title" className="text-title">
                Cho mượn &amp; đi mượn
              </h2>
              <p className="text-caption text-muted-foreground">Tính từ trước tới nay, không riêng khoảng này</p>
            </div>
            <Link
              href="/loans?view=loans"
              className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-label text-primary hover:underline"
            >
              Xem từng khoản <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LoanTile href="/loans?view=loans#ho-no-ban" label="Người ta còn nợ bạn" value={report.receivable} tone="income" />
            <LoanTile href="/loans?view=loans#ban-no-ho" label="Bạn còn nợ người ta" value={-report.payable} tone="expense" />
          </div>
        </section>
      )}
    </div>
  );
}

function signed(v: number) {
  return v === 0 ? formatMoney(0) : `${v > 0 ? "+" : "−"}${formatMoney(Math.abs(v))}`;
}

function categoryTable(caption: string, rows: { name: string; value: number }[], total: number) {
  return (
    <DataTable
      caption={caption}
      head={["Loại", "Số tiền", "Tỉ lệ"]}
      rows={rows.map((r) => [r.name, formatMoney(r.value), total > 0 ? `${Math.round((r.value / total) * 100)}%` : "—"])}
      foot={rows.length > 1 ? ["Cộng", formatMoney(total), "100%"] : undefined}
    />
  );
}

function LoanTile({
  href,
  label,
  value,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  tone: "income" | "expense";
}) {
  return (
    <Link
      href={href}
      className="focus-ring flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-sunken"
    >
      <span className="text-body text-muted-foreground">{label}</span>
      <Amount value={value} tone={tone} size="row" icon />
    </Link>
  );
}
