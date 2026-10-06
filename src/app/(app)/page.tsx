import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  ALL_MONTHS,
  getCategoryOptions,
  getMemberOptions,
  getMonthDayTotals,
  getTransactions,
  getUnknownAmountTransactions,
  scopeWith,
  type TransactionSort,
} from "@/lib/queries";
import { FilterBar } from "@/components/filter-bar";
import { MonthCalendar, type SeedItem } from "@/components/month-calendar";
import { MonthStrip } from "@/components/month-strip";
import { CollapsibleCalendar } from "@/components/ledger/collapsible-calendar";
import { PendingTransactions } from "@/components/pending-transactions";
import { TransactionList, type TransactionItem } from "@/components/transaction-list";
import { UnknownAmountTransactions } from "@/components/unknown-amount-transactions";
import { NoGroupState, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { QuickAddCta } from "@/components/quick-add-cta";
import { currentMonth, formatMonth } from "@/lib/utils";
import { LedgerLiveRefresh } from "@/components/ledger-live-refresh";

export const metadata = { title: "Ghi chép" };

/**
 * GHI CHÉP — mọi khoản tiền vào/ra, theo tháng. Đây là trang chủ.
 *
 * Từ trên xuống: thanh tháng (‹ tháng ›) · lịch tháng gấp được, tổng tháng ở
 * chân lịch · thanh lọc · hai khối nhắc việc · danh sách gom theo ngày.
 *
 * Bấm một ô lịch mở sheet của ngày đó (xem `month-calendar.tsx`); `?day=` cũ bị
 * bỏ qua vô hại. `/transactions` 308 về đây (next.config.ts).
 */
export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    month?: string;
    type?: string;
    category?: string;
    /** Chữ tìm trong ghi chú và tên loại. */
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
  // `?category=` nhận NHIỀU id, ngăn nhau bằng dấu phẩy. Vẫn đúng tên tham số
  // cũ để đường dẫn ai đã lưu lại (một loại) không chết.
  const pickedCategoryIds = [
    ...new Set(
      (sp.category ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ].slice(0, 50);
  const filter = { month, type, categoryIds: pickedCategoryIds, q, sort };

  const { groupId, data } = await scopeWith(userId, sp.group, (id) =>
    Promise.all([
      getTransactions(userId, id, filter),
      // Loại hay dùng đứng trước — cho form sửa khoản mở từ danh sách/lịch.
      getCategoryOptions(id),
      getMemberOptions(id),
      // Tổng theo từng ngày: vẽ lịch, và cũng là tổng của CẢ THÁNG cho dải tháng
      // ở đầu trang.
      // `q` phải truyền cả vào đây, không chỉ vào danh sách: hai thứ này vẽ ra
      // cùng một tập khoản. Thiếu nó thì dải tháng báo "12 khoản" trong khi
      // danh sách chỉ hiện 1, và kết luận duy nhất người dùng rút ra được là
      // app đang hỏng. Đây là đổi tham số, không phải thêm truy vấn.
      getMonthDayTotals(id, month, { type, categoryIds: pickedCategoryIds, q }),
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
  // Sheet lọc thì xếp lại theo TÊN: ở đó người ta dò một cái tên trong danh sách
  // dọc, khác lưới ghi khoản — nơi loại hay dùng phải nằm sẵn dưới ngón tay.
  const categoryOptions = categories
    .filter((c) => !type || c.type === type)
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const filtered = Boolean(type || pickedCategoryIds.length || q);
  const monthName = formatMonth(month).toLowerCase();

  const empty = q
    ? {
        icon: "search" as const,
        title: "Không tìm thấy",
        text: allMonths
          ? `Không có khoản nào có chữ “${q}” trong cả sổ.`
          : `Không có khoản nào có chữ “${q}” trong ${monthName}.`,
        action: !allMonths ? (
          <Button asChild variant="outline">
            <Link href={`/?${new URLSearchParams({ q, month: ALL_MONTHS }).toString()}`}>
              Tìm trong tất cả các tháng
            </Link>
          </Button>
        ) : undefined,
      }
    : filtered
      ? {
          icon: "filter" as const,
          title: "Không có khoản nào khớp bộ lọc",
          text: "Thử bỏ bớt điều kiện lọc để xem lại tất cả.",
          action: (
            <Button asChild variant="outline">
              <Link href={`/?${new URLSearchParams({ month }).toString()}`}>Xoá lọc</Link>
            </Button>
          ),
        }
      : {
          icon: "receipt" as const,
          title: `Chưa có khoản nào trong ${monthName}`,
          text: "Ghi khoản đầu tiên — chỉ cần số tiền và loại.",
          action: <QuickAddCta label="Ghi khoản" />,
        };

  return (
    <div className="space-y-4">
      <LedgerLiveRefresh groupId={groupId} />
      <PageHeader title="Ghi chép" subtitle="Mọi khoản tiền vào, tiền ra" />

      {/* Tìm mọi tháng thì không có tháng nào đang xem: bỏ thanh tháng và lịch,
          nói rõ đang ở chế độ nào và đường quay về. */}
      {allMonths ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-body">Đang tìm trong tất cả các tháng</p>
          <Button asChild variant="outline" size="sm">
            <Link href={q ? `/?${new URLSearchParams({ q }).toString()}` : "/"}>
              Quay lại tháng này
            </Link>
          </Button>
        </div>
      ) : (
        <Suspense>
          <MonthStrip month={month} />
        </Suspense>
      )}

      {!allMonths && (
        <CollapsibleCalendar
          summary={dayTotals.length > 0 ? `${dayTotals.length} ngày có ghi` : undefined}
        >
          <Suspense>
            <MonthCalendar
              month={month}
              days={dayTotals}
              // Trang đã tải sẵn 30 khoản đầu của tháng — lịch mượn lại để mở
              // sheet của một ngày không cần hỏi server.
              monthItems={page.items as unknown as SeedItem[]}
              groupId={groupId}
              categories={categories}
              members={members}
              currentUserId={userId}
              filter={{ type, categoryIds: pickedCategoryIds, q }}
            />
          </Suspense>
        </CollapsibleCalendar>
      )}

      <Suspense>
        <FilterBar
          type={type}
          categoryIds={pickedCategoryIds}
          q={q}
          sort={sp.sap ?? ""}
          categories={categoryOptions}
        />
      </Suspense>

      {/* Việc còn dở đứng TRƯỚC danh sách. "Chưa điền tiền" theo tháng đang xem
          và cần tay người dùng, nên đứng trên "chờ gửi" (tự xong khi có mạng,
          và không theo tháng vì chưa vào CSDL). */}
      <UnknownAmountTransactions
        groupId={groupId}
        categories={categories}
        members={members}
        currentUserId={userId}
        items={unknownAmount as unknown as TransactionItem[]}
        month={allMonths ? null : month}
      />
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
        // Sắp theo số tiền thì KHÔNG gom theo ngày — thứ tự nhìn thấy phải
        // khớp thứ tự đã chọn.
        grouped={sort !== "nhieu"}
        emptyIcon={empty.icon}
        emptyTitle={empty.title}
        emptyText={empty.text}
        emptyAction={empty.action}
      />
    </div>
  );
}
