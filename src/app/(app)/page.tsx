import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMemberOptions, getMonthDayTotals, getTransactions, scopeWith } from "@/lib/queries";
import { FilterBar } from "@/components/filter-bar";
import { MonthCalendar } from "@/components/month-calendar";
import { MonthStrip } from "@/components/month-strip";
import { TransactionList, type TransactionItem } from "@/components/transaction-list";
import { NoGroupState, PageHeader } from "@/components/page-shell";
import { currentMonth, formatDate, formatMonth } from "@/lib/utils";

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
 *
 * LỊCH LUÔN HIỆN, KHÔNG CÒN NÚT ĐỔI CÁCH XEM. Trước đây có `?view=lich` bật/tắt
 * lịch, nhưng hai lựa chọn đó không loại trừ nhau: lịch trả lời "tiêu đậm vào
 * ngày nào", danh sách trả lời "đã tiêu những gì", và người dùng muốn cả hai
 * cùng lúc chứ không phải bấm qua lại. Giờ lịch nằm trên, danh sách nằm dưới,
 * bấm một ô lịch thêm `?day=` để danh sách thu về ngày đó.
 */
export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    month?: string;
    day?: string;
    type?: string;
    category?: string;
  }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;
  const sp = await searchParams;

  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : currentMonth();
  // Ngày chỉ được coi là hợp lệ khi nó nằm trong tháng đang xem: `?day=` có thể
  // đến từ link cũ hay người dùng tự sửa URL, và một ngày ngoài tháng sẽ cho ra
  // danh sách rỗng mà lịch không có ô nào sáng để giải thích.
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "") && sp.day!.startsWith(month)
    ? sp.day!
    : undefined;
  const type =
    sp.type === "INCOME"
      ? ("INCOME" as const)
      : sp.type === "EXPENSE"
        ? ("EXPENSE" as const)
        : undefined;
  const filter = { month, day, type, categoryId: sp.category };

  const { groupId, data } = await scopeWith(userId, sp.group, (id) =>
    Promise.all([
      getTransactions(userId, id, filter),
      prisma.category.findMany({
        where: { groupId: id },
        select: { id: true, name: true, icon: true, type: true },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
      getMemberOptions(id),
      // Tổng theo từng ngày: vẽ lịch, và cũng là tổng của CẢ THÁNG cho dải tháng
      // ở đầu trang — tổng của `getTransactions` bị bó theo `day` khi đang xem
      // riêng một ngày, nên không dùng được cho dải tháng.
      getMonthDayTotals(id, month, { type, categoryId: sp.category }),
    ])
  );
  if (!groupId || !data) return <NoGroupState />;

  const [page, categories, members, dayTotals] = await data;
  if (!page) return <NoGroupState />;

  const monthIncome = dayTotals.reduce((s, d) => s + d.income, 0);
  const monthExpense = dayTotals.reduce((s, d) => s + d.expense, 0);

  // Loại có phân chi/thu, nên khi đang xem một chiều thì chỉ đưa loại chiều đó.
  const categoryOptions = categories
    .filter((c) => !type || c.type === type)
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon }));

  return (
    /* space-y-6 là nhịp dọc chung của mọi trang từ đợt làm mới. Trước đây mỗi
       trang tự chọn 4/5/6/7, nên chuyển trang là khoảng thở đổi theo — mắt đọc
       cái đó ra là "mỗi trang một kiểu" chứ không đọc ra con số.

       Lịch và bộ lọc gom vào MỘT cụm space-y-3: cả hai đều là thứ ĐIỀU KHIỂN
       danh sách bên dưới, nên chúng phải dính nhau và cùng tách khỏi danh sách,
       thay vì rải đều cách nhau y như mọi khối khác. */
    <div className="space-y-6">
      <PageHeader title="Ghi chép" subtitle="Mọi khoản tiền vào, tiền ra của sổ" />

      <MonthStrip month={month} income={monthIncome} expense={monthExpense} />

      <div className="space-y-3">
        <Suspense>
          <MonthCalendar month={month} days={dayTotals} selected={day} />
        </Suspense>

        <Suspense>
          <FilterBar type={type} categoryId={sp.category} day={day} categories={categoryOptions} />
        </Suspense>
      </div>

      <TransactionList
        groupId={groupId}
        categories={categories}
        members={members}
        currentUserId={userId}
        items={page.items as unknown as TransactionItem[]}
        nextCursor={page.nextCursor}
        filter={filter}
        emptyText={
          day
            ? `Ngày ${formatDate(day)} chưa ghi khoản nào${sp.category || type ? " khớp với bộ lọc đang bật" : ""}.`
            : sp.category || type
              ? "Không có khoản nào khớp với bộ lọc đang bật. Bỏ lọc để xem lại tất cả."
              : `Chưa ghi khoản nào trong ${formatMonth(month).toLowerCase()}. Bấm nút ＋ Ghi ở dưới để ghi khoản đầu tiên.`
        }
      />
    </div>
  );
}
