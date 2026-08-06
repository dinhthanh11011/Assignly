import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { byUrgency, getGroupBalance, getLoans, scopeWith } from "@/lib/queries";
import { FilterChips } from "@/components/scope-picker";
import { AddLoanButton } from "@/components/loan-dialog";
import { DebtTabs } from "@/components/debt-tabs";
import { LoanList } from "@/components/loan-list";
import { GroupBalancePanel } from "@/components/group-balance-panel";
import { LinkRow, NoGroupState, PageHeader } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Nợ" };

/**
 * TRANG NỢ — một chỗ duy nhất cho câu hỏi "ai nợ ai", với hai tab.
 *
 * Trước đây đây là hai mục menu tách rời: "Vay nợ" (`/loans`) và "Cân đối"
 * (`/balance`). Cả hai đều nói về nợ, đều dùng chữ "còn phải thu / còn phải
 * trả", và không chỗ nào giải thích chúng khác nhau ở đâu — người dùng nêu
 * đích danh hai cụm đó là "nhìn vào không hiểu".
 *
 * Chúng khác nhau ở QUAN HỆ: người kia là người ngoài sổ hay người trong sổ.
 * Quan hệ chỉ học được bằng cách đặt cạnh nhau mà so, nên chúng thành hai tab
 * kề nhau, mỗi tab một câu mô tả cùng khuôn — chỉ khác "người ta" / "người
 * trong sổ". Xem thêm ghi chú trong debt-tabs.tsx.
 *
 * Sổ một người thì tab "Tiền chung" không hiện ra chút nào: người dùng một mình
 * không bao giờ phải thắc mắc nó là gì. Bản cũ để `/balance` thành một dòng
 * menu chết hiện lời xin lỗi.
 */
export default async function DebtPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; xem?: string; status?: string }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;
  const sp = await searchParams;

  const status =
    sp.status === "PAID"
      ? ("PAID" as const)
      : sp.status === "CANCELLED"
        ? ("CANCELLED" as const)
        : sp.status === "ALL"
          ? undefined
          : ("ACTIVE" as const);

  const { groupId, data } = await scopeWith(userId, sp.group, (id) =>
    Promise.all([
      getLoans(userId, id, { status }),
      // Số tổng luôn tính trên toàn bộ khoản đang mở của sổ, không phụ thuộc bộ
      // lọc — để các con số không nhảy khi người dùng lọc danh sách.
      getLoans(userId, id, { status: "ACTIVE" }),
      // Chỉ cần đếm người: nếu sổ một mình thì không có tab "Tiền chung".
      getGroupBalance(userId, id),
    ])
  );
  if (!groupId || !data) return <NoGroupState />;

  const [filtered, allActive, balance] = await data;
  if (!filtered || !allActive) return <NoGroupState />;

  const open = allActive.filter((l) => l.remaining > 0);
  const receivable = open.filter((l) => l.type === "LEND").reduce((s, l) => s + l.remaining, 0);
  const payable = open.filter((l) => l.type === "BORROW").reduce((s, l) => s + l.remaining, 0);
  const attention = open.filter((l) => l.attention).sort(byUrgency);
  const shared = (balance?.memberCount ?? 1) > 1;

  // Sổ chung mở thẳng vào "Tiền chung" — đó là thứ nhiều người cùng sổ vào đây
  // để xem. Sổ một mình thì chỉ có "Mượn tiền". `?xem=` gõ tay vẫn thắng.
  const tab = sp.xem === "chung" ? "chung" : sp.xem === "muon" ? "muon" : shared ? "chung" : "muon";

  // Hàng lọc trạng thái chỉ hiện khi sổ THẬT SỰ có khoản đã đóng — không bắt
  // người dùng nhìn một bộ lọc chẳng lọc được gì.
  const hasClosed = filtered.some((l) => l.status !== "ACTIVE") || status !== "ACTIVE";

  return (
    <div className="space-y-4">
      <PageHeader title="Nợ" subtitle="Ai còn nợ bạn, bạn còn nợ ai">
        {tab === "muon" && <AddLoanButton groupId={groupId} />}
      </PageHeader>

      <DebtTabs active={tab} attentionCount={attention.length} showShared={shared} />

      {tab === "chung" && shared ? (
        <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
          <GroupBalancePanel userId={userId} groupId={groupId} />
        </Suspense>
      ) : (
        <>
          {/* Hai câu, không phải hai danh từ kế toán. Bấm vào là xuống đúng mục. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LinkRow
              href="#ho-no-ban"
              icon={ArrowUpRight}
              tone="income"
              label="Người ta còn nợ bạn"
              value={formatMoney(receivable)}
            />
            <LinkRow
              href="#ban-no-ho"
              icon={ArrowDownLeft}
              tone="warning"
              label="Bạn còn nợ người ta"
              value={formatMoney(payable)}
            />
          </div>

          {hasClosed && (
            <Suspense>
              <FilterChips
                param="status"
                value={sp.status ?? ""}
                options={[
                  { value: "", label: "Còn nợ" },
                  { value: "PAID", label: "Đã trả xong" },
                  { value: "CANCELLED", label: "Đã bỏ" },
                  { value: "ALL", label: "Tất cả" },
                ]}
              />
            </Suspense>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
              <p className="text-4xl">🤝</p>
              <p className="mt-3.5 text-body text-muted-foreground">
                {status === "ACTIVE"
                  ? "Không ai nợ ai cả. Bấm “Ghi khoản mượn” khi có ai đó mượn tiền bạn, hoặc bạn mượn của người ta."
                  : "Không có khoản nào ở mục này."}
              </p>
            </div>
          ) : (
            <LoanList loans={filtered} attention={attention} />
          )}
        </>
      )}
    </div>
  );
}
