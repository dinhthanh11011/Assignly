import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  ALL_MONTHS,
  getMemberOptions,
  getMonthDayTotals,
  getTransactions,
  getUnknownAmountTransactions,
  scopeWith,
  type TransactionSort,
} from "@/lib/queries";
import { FilterBar } from "@/components/filter-bar";
import { MonthCalendar } from "@/components/month-calendar";
import { MonthStrip } from "@/components/month-strip";
import { PendingTransactions } from "@/components/pending-transactions";
import { FilterChips } from "@/components/scope-picker";
import { TransactionList, type TransactionItem } from "@/components/transaction-list";
import { UnknownAmountTransactions } from "@/components/unknown-amount-transactions";
import { NoGroupState, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
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
 *
 * LỊCH LUÔN HIỆN, KHÔNG CÒN NÚT ĐỔI CÁCH XEM. Trước đây có `?view=lich` bật/tắt
 * lịch, nhưng hai lựa chọn đó không loại trừ nhau: lịch trả lời "tiêu đậm vào
 * ngày nào", danh sách trả lời "đã tiêu những gì", và người dùng muốn cả hai
 * cùng lúc chứ không phải bấm qua lại. Giờ lịch nằm trên, danh sách nằm dưới.
 *
 * BẤM MỘT Ô LỊCH MỞ SHEET CỦA NGÀY ĐÓ, không còn `?day=` lọc danh sách bên
 * dưới — xem lý do trong `month-calendar.tsx`. `?day=` cũ trong link/bookmark
 * giờ bị bỏ qua một cách vô hại: trang vẫn mở đúng tháng, chỉ không tự lọc.
 */
export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    month?: string;
    type?: string;
    category?: string;
    /** Chữ tìm trong ghi chú. */
    q?: string;
    /** Cách sắp xếp: moi | cu | nhieu. */
    sap?: string;
  }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;
  const sp = await searchParams;

  // "all" = bỏ giới hạn tháng, chỉ dùng khi đang tìm kiếm (xem lối thoát ở
  // empty state bên dưới). Mọi thứ khác vẫn bó theo một tháng như cũ.
  const month =
    sp.month === ALL_MONTHS
      ? ALL_MONTHS
      : /^\d{4}-\d{2}$/.test(sp.month ?? "")
        ? sp.month!
        : currentMonth();
  const type =
    sp.type === "INCOME"
      ? ("INCOME" as const)
      : sp.type === "EXPENSE"
        ? ("EXPENSE" as const)
        : undefined;
  // Cắt ở 100 ký tự: `q` đi thẳng vào một `contains` của Prisma, và không câu
  // tìm kiếm thật nào dài hơn thế.
  const q = (sp.q ?? "").trim().slice(0, 100) || undefined;
  const sort: TransactionSort =
    sp.sap === "nhieu" ? "nhieu" : sp.sap === "cu" ? "cu" : "moi";
  const filter = { month, type, categoryId: sp.category, q, sort };

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
      // ở đầu trang.
      // `q` phải truyền cả vào đây, không chỉ vào danh sách: hai thứ này vẽ ra
      // cùng một tập khoản. Thiếu nó thì dải tháng báo "12 khoản" trong khi
      // danh sách chỉ hiện 1, và kết luận duy nhất người dùng rút ra được là
      // app đang hỏng. Đây là đổi tham số, không phải thêm truy vấn.
      getMonthDayTotals(id, month, { type, categoryId: sp.category, q }),
      // Chỉ nhận THÁNG, không nhận loại/tìm kiếm: khối nhắc việc nói về tháng đang
      // mở (xem `UnknownAmountTransactions`), nhưng bên trong tháng đó thì phải kể
      // hết — lọc thêm theo chiều hay theo chữ tìm là giấu mất việc còn dở. Đi song
      // song trong cùng `Promise.all` nên không thêm lượt chờ nào cho trang.
      getUnknownAmountTransactions(id, month),
    ])
  );
  if (!groupId || !data) return <NoGroupState />;

  const [page, categories, members, dayTotals, unknownAmount] = await data;
  if (!page) return <NoGroupState />;

  const allMonths = month === ALL_MONTHS;

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

      {/* Chế độ "tìm mọi tháng" bỏ hẳn dải tháng và lịch: cả hai đều nói về MỘT
          tháng cụ thể, mà lúc này không có tháng nào đang được xem. Thay vào đó
          là một hàng nói rõ đang ở chế độ nào và đường quay về. */}
      {allMonths ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-sunken px-4 py-3">
          <p className="text-body">Đang tìm trong tất cả các tháng</p>
          <Button asChild variant="outline" size="sm">
            <Link href={q ? `/?${new URLSearchParams({ q }).toString()}` : "/"}>
              Quay lại tháng này
            </Link>
          </Button>
        </div>
      ) : (
        <MonthStrip month={month} />
      )}

      <div className="space-y-3">
        {!allMonths && (
          <Suspense>
            <MonthCalendar
              month={month}
              days={dayTotals}
              groupId={groupId}
              members={members}
              filter={{ type, categoryId: sp.category, q }}
            />
          </Suspense>
        )}

        <Suspense>
          <FilterBar
            type={type}
            categoryId={sp.category}
            q={q}
            categories={categoryOptions}
          />
        </Suspense>

        {/* Chỉ hiện khi sổ có gì để mà sắp: một hàng chip vô dụng trên màn hình
            trống là thêm nhiễu cho đúng người đang bối rối nhất. */}
        {page.items.length > 0 && (
          <Suspense>
            <FilterChips
              param="sap"
              label="Sắp xếp danh sách"
              value={sp.sap ?? ""}
              options={[
                { value: "", label: "Mới nhất" },
                { value: "nhieu", label: "Số tiền lớn nhất" },
                { value: "cu", label: "Cũ nhất" },
              ]}
            />
          </Suspense>
        )}
      </div>

      {/* Hai khối nhắc việc, đặt TRƯỚC danh sách vì chúng nói về việc còn dở.
          "Chưa điền số tiền" đi theo tháng đang xem; "chờ gửi" thì không (nó chưa
          có trong CSDL nên chưa thuộc tháng nào cả).

          "Chưa điền số tiền" đứng trên "chờ gửi": khoản chờ gửi tự nó sẽ xong khi
          có mạng, còn khoản chưa điền tiền thì chỉ xong khi CHÍNH người dùng làm
          một việc. Việc cần tay người đứng trước việc tự chạy. */}
      <UnknownAmountTransactions
        groupId={groupId}
        categories={categories}
        members={members}
        currentUserId={userId}
        items={unknownAmount as unknown as TransactionItem[]}
        month={allMonths ? null : month}
      />

      {/* Khoản ghi lúc mất mạng chưa có trong CSDL nên không nằm trong `page.items`.
          Khối này KHÔNG theo bộ lọc tháng/loại ở trên: "chưa lên sổ" là chuyện của
          cả cuốn sổ, lọc nó đi thì người dùng đổi tháng một cái là tưởng mất khoản. */}
      <PendingTransactions
        groupId={groupId}
        categories={categories}
        members={members}
        currentUserId={userId}
      />

      <TransactionList
        groupId={groupId}
        categories={categories}
        members={members}
        currentUserId={userId}
        items={page.items as unknown as TransactionItem[]}
        nextCursor={page.nextCursor}
        filter={filter}
        // Sắp theo số tiền thì KHÔNG gom theo ngày nữa — xem ghi chú trong
        // TransactionList. Quên dòng này là danh sách sai thứ tự một cách im lặng.
        grouped={sort !== "nhieu"}
        emptyText={
          q
            ? allMonths
              ? `Không tìm thấy khoản nào có chữ “${q}” trong cả sổ.`
              : `Không tìm thấy khoản nào có chữ “${q}” trong ${formatMonth(month).toLowerCase()}.`
            : sp.category || type
              ? "Không có khoản nào khớp với bộ lọc đang bật. Bỏ lọc để xem lại tất cả."
              : // "ở dưới" chỉ đúng trên điện thoại: desktop không có nút nổi
                // nào ở đáy màn, chỗ ghi khoản nằm trên thanh trên cùng. Câu chỉ
                // dẫn duy nhất của app cho người mới lại sai một nửa số thiết bị.
                `Chưa ghi khoản nào trong ${formatMonth(month).toLowerCase()}. Bấm nút “Ghi” để ghi khoản đầu tiên.`
        }
        // Lối thoát khỏi cái bẫy "tìm trong đúng một tháng": chỉ hiện khi người
        // dùng ĐANG tìm và tháng này không có gì, nên nó không tốn gì lúc bình
        // thường.
        emptyAction={
          q && !allMonths ? (
            <Button asChild variant="outline">
              <Link href={`/?${new URLSearchParams({ q, month: ALL_MONTHS }).toString()}`}>
                Tìm trong tất cả các tháng
              </Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
