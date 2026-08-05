import { Suspense } from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGroupOptions, getLoans, resolveGroupId } from "@/lib/queries";
import { FilterChips, GroupPicker } from "@/components/scope-picker";
import { AddLoanButton } from "@/components/loan-dialog";
import { LoanCard } from "@/components/loan-card";
import { NoGroupState, PageHeader, StatCard } from "@/components/page-shell";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Vay nợ" };

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; type?: string; status?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const sp = await searchParams;

  const groupId = await resolveGroupId(userId, sp.group);
  if (!groupId) return <NoGroupState />;

  const type =
    sp.type === "LEND" ? ("LEND" as const) : sp.type === "BORROW" ? ("BORROW" as const) : undefined;
  const status =
    sp.status === "PAID"
      ? ("PAID" as const)
      : sp.status === "CANCELLED"
        ? ("CANCELLED" as const)
        : sp.status === "ACTIVE"
          ? ("ACTIVE" as const)
          : undefined;

  const [groups, loans, all] = await Promise.all([
    getGroupOptions(userId),
    getLoans(userId, groupId, { type, status }),
    // Số liệu tổng luôn tính trên toàn bộ khoản đang mở của sổ, không phụ thuộc
    // bộ lọc — để các con số không nhảy khi người dùng lọc danh sách.
    getLoans(userId, groupId, { status: "ACTIVE" }),
  ]);
  if (!loans || !all) return <NoGroupState />;

  const active = all.filter((l) => l.remaining > 0);
  const receivable = active.filter((l) => l.type === "LEND").reduce((s, l) => s + l.remaining, 0);
  const payable = active.filter((l) => l.type === "BORROW").reduce((s, l) => s + l.remaining, 0);
  const overdue = active.filter((l) => l.overdue).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Cho vay & Nợ" subtitle="Tiền bạn cho vay và tiền bạn đang nợ">
        <Suspense>
          <GroupPicker groups={groups} current={groupId} />
        </Suspense>
        <AddLoanButton groupId={groupId} defaultType={type} />
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={ArrowUpRight}
          tone="income"
          label="Còn phải thu"
          value={formatMoney(receivable)}
        />
        <StatCard
          icon={ArrowDownLeft}
          tone="warning"
          label="Còn phải trả"
          value={formatMoney(payable)}
        />
        <StatCard
          icon={AlertTriangle}
          tone={overdue > 0 ? "expense" : "primary"}
          label="Khoản quá hạn"
          value={overdue}
          hint={`${active.length} khoản đang mở`}
        />
      </div>

      <div className="space-y-2">
        <Suspense>
          <FilterChips
            param="type"
            value={type ?? ""}
            options={[
              { value: "", label: "Tất cả" },
              { value: "LEND", label: "Cho vay" },
              { value: "BORROW", label: "Đi vay" },
            ]}
          />
        </Suspense>
        <Suspense>
          <FilterChips
            param="status"
            value={status ?? ""}
            options={[
              { value: "", label: "Mọi trạng thái" },
              { value: "ACTIVE", label: "Đang nợ" },
              { value: "PAID", label: "Đã tất toán" },
              { value: "CANCELLED", label: "Đã huỷ" },
            ]}
          />
        </Suspense>
      </div>

      {loans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-4xl">🤝</p>
          <p className="mt-3.5 text-sm text-muted-foreground">
            Chưa có khoản vay nào. Bấm “Khoản vay mới” để ghi khoản đầu tiên.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {loans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} />
          ))}
        </div>
      )}
    </div>
  );
}
