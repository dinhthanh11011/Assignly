import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMemberOptions, getTransactions, scopeWith } from "@/lib/queries";
import { FilterBar } from "@/components/filter-bar";
import { MonthStrip } from "@/components/month-strip";
import { TransactionList, type TransactionItem } from "@/components/transaction-list";
import { NoGroupState, PageHeader } from "@/components/page-shell";
import { currentMonth, formatMonth } from "@/lib/utils";

export const metadata = { title: "Ghi chép" };

/**
 * TRANG CHỦ CHÍNH LÀ CUỐN SỔ.
 *
 * Đây là sửa chữa lớn nhất của cả đợt thiết kế lại. Trước đây có hai trang —
 * "Tổng quan" và "Giao dịch" — cùng dựng từ đúng một bộ khung (PageHeader +
 * chọn sổ + chọn tháng + nút ghi + BalanceHero), nên nhìn gần như y hệt nhau và
 * người dùng liên tục nhầm mình đang ở đâu.
 *
 * Cách sửa không phải là "làm cho hai trang khác nhau đi" mà là BỎ HẲN MỘT
 * TRANG. Soi từng khối của Tổng quan thì khối nào cũng có chủ tốt hơn:
 *   · panel số dư     → trùng khít với hero của trang Giao dịch → chỉ còn một
 *   · hai ô nợ        → vốn chỉ là link sang /loans → về /loans
 *   · thẻ nợ nhóm     → vốn chỉ là link sang /balance → về tab "Tiền chung"
 *   · nợ sắp tới hẹn  → đã bị trùng sẵn với "Cần nhắc" ở /loans
 *   · biểu đồ chi     → về /reports, chỗ của biểu đồ
 *   · 8 khoản gần đây → chính là danh sách này, không cắt ngắn nữa
 * Phân phối xong thì Tổng quan không còn gì để hiện.
 *
 * `/transactions` giờ 308-redirect về đây (xem next.config.ts) để mọi link cũ
 * và shortcut trên màn hình chính vẫn chạy.
 */
export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; month?: string; type?: string; category?: string }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;
  const sp = await searchParams;

  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : currentMonth();
  const type =
    sp.type === "INCOME"
      ? ("INCOME" as const)
      : sp.type === "EXPENSE"
        ? ("EXPENSE" as const)
        : undefined;
  const filter = { month, type, categoryId: sp.category };

  const { groupId, data } = await scopeWith(userId, sp.group, (id) =>
    Promise.all([
      getTransactions(userId, id, filter),
      prisma.category.findMany({
        where: { groupId: id },
        select: { id: true, name: true, icon: true, type: true },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
      getMemberOptions(id),
    ])
  );
  if (!groupId || !data) return <NoGroupState />;

  const [page, categories, members] = await data;
  if (!page) return <NoGroupState />;

  // Loại có phân chi/thu, nên khi đang xem một chiều thì chỉ đưa loại chiều đó.
  const categoryOptions = categories
    .filter((c) => !type || c.type === type)
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon }));

  return (
    <div className="space-y-4">
      <PageHeader title="Ghi chép" subtitle="Mọi khoản tiền vào, tiền ra của sổ" />

      <MonthStrip month={month} income={page.income} expense={page.expense} />

      <Suspense>
        <FilterBar type={type} categoryId={sp.category} categories={categoryOptions} />
      </Suspense>

      <TransactionList
        groupId={groupId}
        categories={categories}
        members={members}
        currentUserId={userId}
        items={page.items as unknown as TransactionItem[]}
        nextCursor={page.nextCursor}
        filter={filter}
        emptyText={
          sp.category || type
            ? "Không có khoản nào khớp với bộ lọc đang bật. Bỏ lọc để xem lại tất cả."
            : `Chưa ghi khoản nào trong ${formatMonth(month).toLowerCase()}. Bấm nút ＋ Ghi ở dưới để ghi khoản đầu tiên.`
        }
      />
    </div>
  );
}
