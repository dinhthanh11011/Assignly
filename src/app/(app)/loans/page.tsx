import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { byUrgency, countClosedLoans, getGroupBalance, getLoans, scopeWith } from "@/lib/queries";
import { AddLoanButton } from "@/components/loan-dialog";
import { DebtTabs, type DebtTab } from "@/components/debt-tabs";
import { LoanList } from "@/components/loan-list";
import { GroupBalancePanel } from "@/components/group-balance-panel";
import { LinkRow, NoGroupState, PageHeader } from "@/components/page-shell";
import { SearchBox } from "@/components/search-box";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Archive, Handshake, SearchX } from "lucide-react";
import { DebtSummary } from "@/components/loans/debt-summary";
import { EmptyState } from "@/components/ui/empty-state";
import { LedgerLiveRefresh } from "@/components/ledger-live-refresh";

export const metadata = { title: "Nợ" };

/** Tên tab cũ (`?xem=muon` / `?xem=chung`) → tên hiện tại. Xem ghi chú ở `tab`. */
const LEGACY_TAB: Record<string, DebtTab | undefined> = { muon: "loans", chung: "shared" };

/**
 * TRANG NỢ — "ai nợ ai", hai tab cạnh nhau:
 *   · Mượn tiền — người NGOÀI sổ, tên gõ tay, có gốc / hạn / lãi.
 *   · Tiền chung — người TRONG sổ, số nợ tính ra từ việc chia tiền chi chung.
 * Sổ một người thì không có tab "Tiền chung".
 */
export default async function DebtPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    view?: string;
    xem?: string;
    /** Chữ tìm trong tên người / ghi chú của khoản mượn. */
    q?: string;
  }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;
  const sp = await searchParams;
  // Cắt ở 100 ký tự: `q` đi thẳng vào một `contains` của Prisma, và không câu
  // tìm kiếm thật nào dài hơn thế.
  const q = (sp.q ?? "").trim().slice(0, 100) || undefined;

  const { groupId, data } = await scopeWith(userId, sp.group, (id) =>
    Promise.all([
      // Chỉ khoản CÒN NỢ: trang này trả lời "ai còn nợ ai", và khoản đã đóng thì
      // không còn là câu trả lời. Xem lại chuyện đã xong là việc của `/loans/closed`.
      getLoans(userId, id, { status: "ACTIVE", q }),
      // Chỉ cần đếm người: nếu sổ một mình thì không có tab "Tiền chung".
      getGroupBalance(userId, id),
      countClosedLoans(id),
    ])
  );
  if (!groupId || !data) return <NoGroupState />;

  const [allActive, balance, closedCount] = await data;
  if (!allActive) return <NoGroupState />;

  const open = allActive.filter((l) => l.remaining > 0);
  const receivable = open.filter((l) => l.type === "LEND").reduce((s, l) => s + l.remaining, 0);
  const payable = open.filter((l) => l.type === "BORROW").reduce((s, l) => s + l.remaining, 0);
  const attention = open.filter((l) => l.attention).sort(byUrgency);
  const shared = (balance?.memberCount ?? 1) > 1;

  // Sổ chung mở thẳng vào "Tiền chung" — đó là thứ nhiều người cùng sổ vào đây
  // để xem. Sổ một mình thì chỉ có "Mượn tiền". `?view=` gõ tay vẫn thắng.
  //
  // `?xem=` là tên cũ của tham số này, vẫn đọc: `payload.url` của Notification
  // nằm vĩnh viễn trong DB (xem ghi chú redirects ở next.config.ts), nên những
  // thông báo đã gửi trước lần đổi tên còn mang `?xem=chung` mãi mãi.
  //
  // Đang tìm thì mặc định về tab "Mượn tiền": ô tìm kiếm chỉ soi danh sách khoản
  // mượn, nên mở một link `?q=` vào tab "Tiền chung" là hiện ra một trang không
  // liên quan gì tới chữ vừa tìm. `?view=shared` gõ tay vẫn thắng.
  const wanted = sp.view ?? LEGACY_TAB[sp.xem ?? ""];
  const tab: DebtTab =
    wanted === "shared"
      ? "shared"
      : wanted === "loans"
        ? "loans"
        : q
          ? "loans"
          : shared
            ? "shared"
            : "loans";

  const hasAny = allActive.length > 0 || closedCount > 0;
  const closedHref = q ? `/loans/closed?${new URLSearchParams({ q }).toString()}` : "/loans/closed";

  return (
    <div className="space-y-6">
      <LedgerLiveRefresh groupId={groupId} />
      <PageHeader title="Nợ" subtitle="Ai còn nợ bạn, bạn còn nợ ai">
        {/* Ghi khoản mượn hợp lệ từ cả hai tab. Sổ chưa có khoản nào thì nút
            chính nằm trong ô trống bên dưới — một màn một nút chính. */}
        {(hasAny || tab === "shared") && <AddLoanButton groupId={groupId} variant="soft" />}
      </PageHeader>

      <DebtTabs active={tab} attentionCount={attention.length} showShared={shared} />

      {tab === "shared" && shared ? (
        <Suspense fallback={<SharedSkeleton />}>
          <GroupBalancePanel userId={userId} groupId={groupId} />
        </Suspense>
      ) : !hasAny && !q ? (
        <EmptyState
          icon={Handshake}
          title="Không ai nợ ai cả"
          action={<AddLoanButton groupId={groupId} alwaysVisible />}
        >
          Khi bạn cho ai mượn tiền, hoặc mượn của người ta, ghi lại ở đây. App sẽ nhắc khi tới hẹn trả.
        </EmptyState>
      ) : (
        <>
          {/* Khi đang tìm, hai con số chỉ tính các khoản KHỚP — cùng tập với
              danh sách bên dưới, không thì người dùng tưởng app tính sai. */}
          <DebtSummary
            receivable={receivable}
            payable={payable}
            lendCount={open.filter((l) => l.type === "LEND").length}
            borrowCount={open.filter((l) => l.type === "BORROW").length}
          />

          <Suspense>
            <SearchBox
              value={q}
              label="Tìm khoản mượn theo tên người hoặc ghi chú"
              placeholder="Tìm tên người, ghi chú…"
            />
          </Suspense>

          {allActive.length === 0 ? (
            q ? (
              <EmptyState
                icon={SearchX}
                title={`Không có khoản đang nợ nào có chữ “${q}”`}
                // Người tìm một cái tên thường đang tìm chuyện đã cũ.
                action={
                  closedCount > 0 ? (
                    <Button asChild variant="outline">
                      <Link href={closedHref}>Tìm trong các khoản đã xong</Link>
                    </Button>
                  ) : undefined
                }
              >
                Thử một cái tên khác, hoặc xoá chữ đang tìm.
              </EmptyState>
            ) : (
              <EmptyState icon={Handshake} title="Đã trả hết, không còn ai nợ ai">
                Các khoản đã xong vẫn còn trong mục bên dưới.
              </EmptyState>
            )
          ) : (
            <LoanList loans={allActive} attention={attention} />
          )}

          {/* Kho lưu ở CUỐI trang: khoản đã xong không phải việc phải làm. */}
          {closedCount > 0 && (
            <LinkRow
              href={closedHref}
              icon={Archive}
              tone="primary"
              label="Các khoản đã xong"
              value={`${closedCount} khoản`}
            />
          )}
        </>
      )}
    </div>
  );
}

function SharedSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
