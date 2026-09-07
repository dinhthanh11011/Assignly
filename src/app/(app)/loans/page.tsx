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
import { Archive, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Nợ" };

/** Tên tab cũ (`?xem=muon` / `?xem=chung`) → tên hiện tại. Xem ghi chú ở `tab`. */
const LEGACY_TAB: Record<string, DebtTab | undefined> = { muon: "loans", chung: "shared" };

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

  return (
    <div className="space-y-6">
      <PageHeader title="Nợ" subtitle="Ai còn nợ bạn, bạn còn nợ ai">
        {/* Không còn ràng vào tab "loans": sổ CHUNG mặc định mở tab "Tiền chung",
            nên bản cũ khiến người dùng desktop mở /loans của một sổ chung mà
            không thấy nút tạo nào cả — phải đoán ra là phải đổi tab trước.
            Ghi một khoản mượn bên ngoài là việc hợp lệ từ cả hai tab. */}
        <AddLoanButton groupId={groupId} />
      </PageHeader>

      <DebtTabs active={tab} attentionCount={attention.length} showShared={shared} />

      {tab === "shared" && shared ? (
        <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
          <GroupBalancePanel userId={userId} groupId={groupId} />
        </Suspense>
      ) : (
        <>
          {/* Ô tìm kiếm: tìm theo TÊN NGƯỜI hoặc ghi chú. Một người dùng lâu năm
              có vài chục khoản trong tab này, và cách họ nhớ một khoản luôn là
              tên người — nhưng danh sách chỉ chia theo chiều, nên tìm "anh Nam"
              trước đây là cuộn tay qua cả hai mục.

              Chỉ hiện khi có gì để mà tìm: sổ chưa có khoản nào (kể cả khoản đã
              xong) thì một ô tìm kiếm trống chỉ là thêm nhiễu cho đúng người
              đang bối rối nhất. Khi ĐANG tìm thì luôn hiện — nếu không, kết quả
              rỗng sẽ làm ô nhập biến mất cùng với đường gỡ chữ tìm ra. */}
          {(q || allActive.length > 0 || closedCount > 0) && (
            <Suspense>
              <SearchBox
                value={q}
                label="Tìm khoản mượn theo tên người hoặc ghi chú"
                placeholder="Tìm tên người, ghi chú…"
              />
            </Suspense>
          )}

          {/* Hai câu, không phải hai danh từ kế toán. Bấm vào là xuống đúng mục.
              Khi đang tìm, hai con số này chỉ tính các khoản KHỚP — cùng tập với
              danh sách ngay dưới. Một tổng "toàn sổ" đặt trên một danh sách đã
              lọc là cách chắc chắn nhất để người dùng kết luận app tính sai. */}
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

          {allActive.length === 0 ? (
            q ? (
              <EmptyState
                emoji="🔍"
                // Lối thoát khỏi cái bẫy "chỉ tìm trong khoản còn nợ": khoản đã
                // trả xong nằm ở kho lưu, và người tìm một cái tên thường đang
                // tìm đúng chuyện đã cũ. Chỉ hiện khi sổ thật sự có khoản đã đóng.
                action={
                  closedCount > 0 ? (
                    <Button asChild variant="outline">
                      <Link href={`/loans/closed?${new URLSearchParams({ q }).toString()}`}>
                        Tìm trong các khoản đã xong
                      </Link>
                    </Button>
                  ) : undefined
                }
              >
                Không có khoản nào đang nợ có chữ “{q}”.
              </EmptyState>
            ) : (
              <EmptyState emoji="🤝">
                Không ai nợ ai cả. Bấm “Ghi khoản mượn” khi có ai đó mượn tiền bạn, hoặc bạn mượn
                của người ta.
              </EmptyState>
            )
          ) : (
            <LoanList loans={allActive} attention={attention} />
          )}

          {/* Đường vào kho lưu, ở CUỐI trang: một khoản đã trả xong không phải
              việc phải làm, nên nó không được chen lên trước các khoản còn nợ.
              Chỉ hiện khi sổ thật sự có khoản đã đóng. */}
          {closedCount > 0 && (
            <LinkRow
              // Mang chữ đang tìm sang kho lưu: đang tìm một cái tên thì thứ
              // muốn xem tiếp là chính cái tên đó trong chuyện đã xong.
              href={q ? `/loans/closed?${new URLSearchParams({ q }).toString()}` : "/loans/closed"}
              icon={Archive}
              tone="primary"
              label="Xem lại các khoản đã xong"
              value={`${closedCount} khoản`}
            />
          )}
        </>
      )}
    </div>
  );
}
