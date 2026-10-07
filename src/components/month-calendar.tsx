"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { call } from "@/lib/action-result";
import { DayDetailDialog, type DayData } from "@/components/day-detail-dialog";
import { useTransactionActions } from "@/components/transaction-actions";
import { type CategoryOption } from "@/components/transaction-dialog";
import type { TransactionItem } from "@/components/transaction-list";
import { loadDayTransactions, loadTransactions } from "@/lib/actions";
import type { MemberOption } from "@/lib/member";
import type { DayTotals } from "@/lib/queries";
import { TRANSACTIONS_PAGE_SIZE } from "@/lib/paging";
import {
  WEEKDAY_LABELS,
  WEEKEND_COLUMNS,
  cn,
  dateKey,
  formatDate,
  formatMoney,
  formatMoneyCell,
  formatMonth,
  formatWeekday,
  monthWeeks,
  today,
} from "@/lib/utils";

/**
 * Một khoản của trang đầu danh sách, đúng như server gửi xuống.
 *
 * `createdAt` không nằm trong `TransactionItem` vì không chỗ nào VẼ nó, nhưng nó
 * vẫn đi kèm trong payload (Prisma trả cả cột), và đây là chỗ cần nó: để xếp các
 * khoản cùng một ngày theo đúng thứ tự `getDayTransactions` sẽ trả về.
 */
export type SeedItem = TransactionItem & { createdAt?: Date | string };

/**
 * Mới nhất trước, trong PHẠM VI MỘT NGÀY — nên chỉ so `createdAt` rồi tới `id`,
 * đúng phần đuôi của `transactionOrderBy("moi")` ở server (`date` đã bằng nhau).
 */
function newestFirst(a: SeedItem, b: SeedItem): number {
  const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (at !== bt) return bt - at;
  return b.id.localeCompare(a.id);
}

/**
 * Lịch một tháng: mỗi ô là một ngày, cao thấp theo mức tiền của ngày đó.
 *
 * Vì sao có lịch bên cạnh danh sách: danh sách trả lời "tôi đã tiêu những gì",
 * còn lịch trả lời "tôi tiêu đậm vào những ngày nào" — nhìn 30 ô cạnh nhau là
 * thấy ngay cuối tuần đắt hơn ngày thường, hay đầu tháng tiêu dồn. Đây cũng là
 * cách người dùng đối chiếu với cuốn sổ giấy, vốn cũng kẻ theo ngày.
 *
 * TRONG Ô CÓ SỐ TIỀN — và đó là một quyết định đã ĐẢO CHIỀU một lần, nên phải
 * đọc kỹ trước khi đảo tiếp.
 *
 * Bản đầu in số vào ô và hỏng: ô rộng ~44px, cỡ chữ nhỏ nhất app cho phép là
 * 13px, người dùng lại tự tăng được lên 1,33× — "−2,4tr" thành "−2…", một con số
 * cắt dở còn tệ hơn không có số. Bản sau thay số bằng hai vạch cao thấp: so
 * được ngày nào tiêu đậm, nhưng KHÔNG trả lời được "hôm đó bao nhiêu" mà không
 * bấm vào, và không khớp với các app sổ thu chi người dùng đang dùng song song.
 *
 * Bản này cho số quay lại, đứng được nhờ ba ràng buộc — gỡ một cái là hỏng như
 * bản đầu:
 *   1. `text-cal` / `text-cal-day` là px CỐ ĐỊNH, không nhân theo --font-scale
 *      (xem phần ngoại lệ trong globals.css). Ô không giãn theo chữ, nên chữ
 *      trong ô cũng không giãn.
 *   2. `formatMoneyCell` chốt trần 5 ký tự ("600k", "1,2tr", "12tr").
 *   3. Mỗi ô nhiều nhất HAI dòng tiền, tiền vào trên tiền ra, mỗi dòng có dấu
 *      +/− dẫn đầu — dấu chứ không phải chỉ màu, vì màu không được là thứ duy
 *      nhất mang thông tin.
 *
 * Cái giá: người chọn "Chữ lớn" không phóng to được số trong ô. Bù lại, bấm
 * một ngày là mở SHEET của ngày đó (`DayDetailDialog`) — số đầy đủ ở cỡ chữ
 * thường, thống kê nhẹ, và mọi khoản đã ghi trong ngày.
 *
 * BẤM MỘT Ô LÀ MỞ SHEET, KHÔNG CÒN LỌC DANH SÁCH BÊN DƯỚI. Bản trước thêm
 * `?day=` vào URL: câu trả lời rơi xuống dưới một màn hình (người dùng bấm xong
 * thấy trang "không đổi gì"), và nó đè lên bộ lọc/sắp xếp đang dùng cho cả
 * tháng. Sheet trả lời ngay tại chỗ vừa bấm, đóng lại là trang y như cũ.
 *
 * Tuần bắt đầu từ CHỦ NHẬT, cột CN đỏ và T7 xanh — quy ước của lịch giấy Việt
 * Nam. Màu cuối tuần thuần trang trí: vị trí cột và nhãn CN/T7 đã nói đủ.
 */
export function MonthCalendar({
  month,
  days,
  monthItems,
  groupId,
  categories,
  members,
  currentUserId,
  filter,
}: {
  month: string;
  days: DayTotals[];
  /**
   * Trang đầu của danh sách bên dưới — CHÍNH những khoản trang này đã tải sẵn.
   * Lịch mượn lại để dựng sheet của một ngày mà không hỏi server (xem `seedFor`).
   */
  monthItems: SeedItem[];
  groupId: string;
  /** Loại, để sửa được một khoản ngay từ sheet của ngày. */
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  /** Bộ lọc đang bật của trang — sheet phải đếm cùng tập khoản với ô lịch. */
  filter: { type?: "INCOME" | "EXPENSE"; categoryIds?: string[]; q?: string };
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  const actions = useTransactionActions({
    groupId,
    categories,
    members,
    currentUserId,
    // "Ghi lại khoản này" mở hộp thoại ghi khoản — sheet của ngày không được tự
    // bật lại cùng lúc với nó.
    onHandOff: () => setOpenDay(null),
  });

  const byDay = useMemo(() => new Map(days.map((d) => [d.day, d])), [days]);

  /**
   * NHỮNG KHOẢN ĐÃ CÓ SẴN, xếp theo ngày.
   *
   * Trang này vốn đã tải 30 khoản đầu của tháng cho danh sách bên dưới, và mở một
   * ô lịch chỉ là hỏi lại một nhúm trong số đó. Ghép với `days` — vốn mang `count`
   * của từng ngày, đếm bằng đúng bộ lọc đang bật — là biết chắc khi nào cầm ĐỦ
   * một ngày: `count` khớp thì không phải hỏi server lần nào nữa.
   */
  const seeds = useMemo(() => {
    const map = new Map<string, SeedItem[]>();
    for (const t of monthItems) {
      const key = dateKey(new Date(t.date));
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    // Danh sách bên dưới có thể đang sắp theo số tiền, còn sheet của một ngày thì
    // luôn đọc mới-nhất-trước — cùng thứ tự `getDayTransactions` trả về, nếu không
    // thì cùng một ngày lại xếp khác nhau tuỳ đường vào.
    for (const list of map.values()) list.sort(newestFirst);
    return map;
  }, [monthItems]);

  /**
   * Nhớ kết quả của những ngày ĐÃ PHẢI HỎI SERVER, trong đúng một lần vẽ từ
   * server. Nhờ nó mà đóng sheet rồi mở lại, hay xem một khoản rồi quay ra, không
   * tốn thêm lượt nào.
   *
   * Cái đảm bảo không bao giờ hiện lại dữ liệu cũ là cái KHOÁ đi kèm: `monthItems`
   * là prop đến từ server, và MỌI thay đổi (ghi thêm, sửa, xoá, điền tiền) đều
   * `revalidatePath("/")` — trang được vẽ lại, prop đổi identity, và cả sổ nhớ này
   * bị vứt đi ngay ở lần dùng kế tiếp. Không có đường nào để một khoản vừa sửa còn
   * nằm lại đây.
   */
  const cacheRef = useRef<{ key: unknown; map: Map<string, Promise<DayData>> }>({
    key: monthItems,
    map: new Map(),
  });

  /** Ruột của một ngày khi trang đã cầm đủ — `null` nghĩa là phải đi hỏi server. */
  const seedFor = useCallback(
    (day: string): DayData | null => {
      const totals = byDay.get(day);
      const items = seeds.get(day) ?? [];
      if (items.length !== (totals?.count ?? 0)) return null;
      return {
        items,
        nextCursor: null,
        income: totals?.income ?? 0,
        expense: totals?.expense ?? 0,
      };
    },
    [byDay, seeds]
  );

  /**
   * Số khoản sheet đang hiện cho mỗi ngày. Sheet được gỡ khỏi cây khi mở chi
   * tiết một khoản, và lúc trở lại nó phải nạp lại ĐỦ ngần ấy — người dùng đã bấm
   * "Xem thêm" tới trang 3 thì không được rơi về trang đầu.
   */
  const shownRef = useRef(new Map<string, number>());

  const loadDay = useCallback(
    (day: string): Promise<DayData> => {
      if (cacheRef.current.key !== monthItems) {
        cacheRef.current = { key: monthItems, map: new Map() };
      }
      const cache = cacheRef.current.map;
      const shown = shownRef.current.get(day) ?? 0;
      // Đã xem quá trang đầu: sổ nhớ chỉ giữ trang đầu, nên hỏi lại đủ số đã hiện.
      if (shown > TRANSACTIONS_PAGE_SIZE) {
        return call(loadDayTransactions(groupId, day, filter, Math.min(shown, 500))).then((res) => ({
          ...res,
          items: res.items as unknown as TransactionItem[],
        }));
      }
      const hit = cache.get(day);
      if (hit) return hit;

      const p = call(loadDayTransactions(groupId, day, filter)).then((res) => ({
        ...res,
        items: res.items as unknown as TransactionItem[],
      }));
      // Lỗi thì ĐỪNG nhớ: lần mở sau phải được thử lại, không phải nhận lại đúng
      // câu lỗi cũ mãi mãi.
      p.catch(() => {
        if (cache.get(day) === p) cache.delete(day);
      });
      cache.set(day, p);
      return p;
    },
    [groupId, monthItems, filter]
  );

  /**
   * Bắt đầu tải NGAY LÚC NGÓN TAY CHẠM XUỐNG, đừng đợi `click`.
   *
   * Giữa `pointerdown` và `click` của một cú chạm trên điện thoại là cả trăm mili
   * giây (nhấc tay + xử lý cử chỉ của trình duyệt), rồi còn hoạt ảnh mở sheet nữa
   * — đủ để một lượt đi/về server chạy xong trước khi có chỗ để hiện nó ra. Kết
   * quả rơi vào `cache` ở trên, nên `click` chỉ việc nhặt lấy.
   */
  const prefetchDay = useCallback(
    (day: string) => {
      if (!seedFor(day)) loadDay(day).catch(() => {});
    },
    [seedFor, loadDay]
  );

  // Tổng tháng cộng thẳng từ `days` — đúng tập khoản đang vẽ trong lịch (kể cả
  // khi bộ lọc đang bật), và không tốn thêm một truy vấn nào.
  const monthIncome = days.reduce((sum, d) => sum + d.income, 0);
  const monthExpense = days.reduce((sum, d) => sum + d.expense, 0);
  const monthUnknown = days.reduce((sum, d) => sum + d.unknown, 0);
  const monthNet = monthIncome - monthExpense;
  const weeks = monthWeeks(month);
  const todayKey = dateKey(today());

  // Đệm và khe hẹp lại ở điện thoại (p-1.5 / gap-0.5, nới ra từ sm:): mỗi 2px
  // lấy về ở đây chia cho 7 cột đều thành bề ngang cho con số trong ô, và ở màn
  // hình 390px thì "−600k" vừa hay không vừa nằm đúng trong khoảng đó.
  return (
    <section
      aria-label={`Lịch thu chi ${formatMonth(month).toLowerCase()}`}
      className="rounded-xl border border-border bg-card p-1.5 sm:p-3.5"
    >
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn("pb-1 text-center text-caption", weekendClass(i) ?? "text-muted-foreground")}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {week.map((day, j) =>
              day === null ? (
                <span key={j} aria-hidden />
              ) : (
                <DayCell
                  key={day}
                  day={day}
                  totals={byDay.get(day)}
                  weekend={weekendClass(j)}
                  selected={day === openDay}
                  isToday={day === todayKey}
                  onPick={() => setOpenDay(day)}
                  onPrefetch={() => prefetchDay(day)}
                />
              )
            )}
          </div>
        ))}
      </div>

      {/* Chú giải: số trong ô rút gọn và mang màu, nên phải có chỗ nói bằng CHỮ
          màu nào là gì. Dấu +/− đã gánh phần đó ngay trong ô, đây là lớp thứ
          hai — và cũng là chỗ nói ra rằng số trong ô là số làm tròn. */}
      <p className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 px-1 text-caption text-muted-foreground">
        <span className="text-income">+ Tiền vào</span>
        <span className="text-expense">− Tiền ra</span>
        <span>Số trong ô đã rút gọn — bấm một ngày để xem đầy đủ.</span>
      </p>

      {/* Tổng của CẢ THÁNG, ngay dưới lưới ngày.

          Vì sao ở đây chứ không ở dải tháng đầu trang: dải tháng chỉ để chuyển
          tháng và cố ý không mang số (xem `month-strip.tsx`). Còn con số này
          cộng đúng từ 30 ô vừa nhìn ở trên — đặt cạnh nhau thì nó là "phần tổng"
          của cùng một khối, không phải một panel số liệu thứ hai của trang.

          Nó đi theo bộ lọc đang bật, y như lưới ngày: hai thứ vẽ từ cùng một
          `days`, nên không bao giờ lệch nhau.

          Số ĐẦY ĐỦ, không rút gọn như trong ô: ở đây có cả chiều ngang một hàng,
          và đây chính là chỗ trả lời "tháng này tổng cộng bao nhiêu" mà không
          phải bấm vào đâu cả. */}
      <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-border px-1 pt-3">
        <MonthFigure label="Tiền vào" value={monthIncome} tone="in" />
        <MonthFigure label="Tiền ra" value={monthExpense} tone="out" />
      </div>
      <p className="mt-2 px-1 text-body">
        Còn lại trong {formatMonth(month).toLowerCase()}:{" "}
        <span className={cn("num font-semibold", monthNet >= 0 ? "text-income" : "text-expense")}>
          {monthNet >= 0 ? "+" : "−"}
          {formatMoney(Math.abs(monthNet))}
        </span>
        {/* Khoản chưa điền số tiền không vào được tổng nào cả — im lặng bỏ qua
            thì tổng trông như đã đủ trong khi nó chưa đủ. */}
        {monthUnknown > 0 && (
          <span className="text-muted-foreground">
            {" "}
            — chưa tính {monthUnknown} khoản chưa điền số tiền
          </span>
        )}
      </p>

      {/* Giữ `openDay` cả khi sheet đang đóng lại thì Radix mất hoạt ảnh đóng,
          nên chỉ dọn state sau khi sheet báo đã đóng.

          `!actions.active`: bấm một khoản trong sheet thì sheet BIẾN MẤT HẲN để
          nhường chỗ cho chuỗi chi tiết — hai Radix dialog cùng mở thì tiêu điểm
          khoá ở cái mở trước và cái mới không bấm được. Gỡ khỏi cây chứ không chỉ
          `open={false}`: để lại đó thì sheet còn sống suốt hoạt ảnh đóng, và lúc
          nó tắt hẳn Radix trả tiêu điểm về ô lịch — giật tiêu điểm ra khỏi hộp
          thoại chi tiết vừa mở.

          `openDay` thì VẪN GIỮ, nên chuỗi đóng là sheet trở lại đúng ngày đang
          xem thay vì bắt người dùng đi tìm lại ô lịch vừa bấm. Lần trở lại đó là
          một lần mount mới, tức là TẢI LẠI ngày đó — đúng thứ cần, vì khoản vừa
          rồi có thể đã bị sửa, xoá hay vừa được điền số tiền. */}
      {openDay && !actions.active && (
        <DayDetailDialog
          key={openDay}
          day={openDay}
          initial={seedFor(openDay)}
          load={() => loadDay(openDay)}
          loadMore={(cursor) =>
            call(loadTransactions(groupId, { ...filter, day: openDay }, cursor)).then((res) => ({
              ...res,
              items: res.items as unknown as TransactionItem[],
            }))
          }
          onShown={(n) => shownRef.current.set(openDay, n)}
          members={members}
          open
          onOpenChange={(o) => !o && setOpenDay(null)}
          onPick={actions.open}
        />
      )}

      {actions.dialogs}
    </section>
  );
}

/** Một ô tổng của tháng: nhãn nhỏ + số đầy đủ, trên nền màu nhạt của chiều đó. */
function MonthFigure({ label, value, tone }: { label: string; value: number; tone: "in" | "out" }) {
  const inbound = tone === "in";
  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2",
        inbound ? "bg-income-surface" : "bg-expense-surface"
      )}
    >
      {/* Dấu +/− đi trước số, như trong ô lịch: màu không được là thứ duy nhất
          mang thông tin. */}
      <div className={cn("text-caption", inbound ? "text-income" : "text-expense")}>{label}</div>
      <div className="num mt-0.5 text-money-row text-foreground">
        {inbound ? "+" : "−"}
        {formatMoney(value)}
      </div>
    </div>
  );
}

/** Màu của cột thứ `index` (0 = CN) — `null` với ngày thường. */
function weekendClass(index: number): string | null {
  const which = WEEKEND_COLUMNS[index as keyof typeof WEEKEND_COLUMNS];
  return which === "sun" ? "text-weekend-sun" : which === "sat" ? "text-weekend-sat" : null;
}

function DayCell({
  day,
  totals,
  weekend,
  selected,
  isToday,
  onPick,
  onPrefetch,
}: {
  day: string;
  totals?: DayTotals;
  weekend: string | null;
  selected: boolean;
  isToday: boolean;
  onPick: () => void;
  /** Chạm xuống ô này — bắt đầu tải trước, xem `prefetchDay`. */
  onPrefetch: () => void;
}) {
  const dayNumber = Number(day.slice(8));
  const expense = totals?.expense ?? 0;
  const income = totals?.income ?? 0;
  const unknown = totals?.unknown ?? 0;

  // Số trong ô là số RÚT GỌN. Nhãn đọc-màn-hình phải đọc số đầy đủ, không đọc
  // "cộng một phẩy hai tê e-rờ".
  const label = [
    `${formatWeekday(day)} ${formatDate(day)}`,
    isToday ? "hôm nay" : null,
    income > 0 ? `tiền vào ${formatMoney(income)}` : null,
    expense > 0 ? `tiền ra ${formatMoney(expense)}` : null,
    unknown > 0 ? `${unknown} khoản chưa điền số tiền` : null,
    !totals ? "chưa ghi khoản nào" : null,
    selected ? "đang mở chi tiết ngày này" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      // Ô lịch mở ra một sheet, không bật/tắt một bộ lọc — nên haspopup +
      // expanded, không phải `aria-pressed` như hồi ô lịch còn là nút lọc.
      aria-haspopup="dialog"
      aria-expanded={selected}
      aria-label={label}
      onClick={onPick}
      // Chỉ `pointerdown`, KHÔNG phải `focus`: đi bàn phím qua lịch là lướt qua
      // 30 ô, mà server action thì chạy lần lượt từng cái một — 30 lượt xếp hàng
      // sẽ làm chậm đúng cái ô người ta thật sự bấm vào.
      onPointerDown={onPrefetch}
      className={cn(
        "focus-ring flex min-h-[68px] flex-col items-stretch overflow-hidden rounded-md border py-1 transition-colors",
        // Ngày đang chọn phải NHÌN LÀ THẤY giữa 30 ô: nền tím + viền tím thôi
        // thì quá nhạt, nên thêm vòng tím dày vào trong. Nền ô vẫn để nhạt vì
        // con số tiền vào/ra trong ô mang màu riêng (xanh/đỏ) — nền đặc là mất
        // luôn cặp màu đó.
        selected
          ? "border-primary bg-primary-surface ring-2 ring-inset ring-primary"
          : isToday
            ? "border-border-strong bg-card hover:bg-sunken"
            : "border-transparent bg-sunken hover:border-border-strong"
      )}
    >
      {/* Số ngày của ô đang chọn nằm trong viên tím đặc — dấu hiệu "đang ở đây"
          quen thuộc của mọi cuốn lịch, và nó không đụng tới màu số tiền. */}
      <span
        className={cn(
          "num text-left text-cal-day",
          selected
            ? "mx-0.5 self-start rounded-sm bg-primary px-1 font-bold text-primary-foreground"
            : isToday
              ? "px-0.5 font-bold text-foreground"
              : cn("px-0.5", weekend ?? "text-foreground")
        )}
      >
        {dayNumber}
      </span>

      {/* Hai dòng tiền, tiền vào LUÔN trên tiền ra. Dấu +/− đi trước con số:
          thứ tự dòng và dấu là hai dấu hiệu ngoài màu.
          `aria-hidden` vì aria-label của nút đã đọc số đầy đủ ở trên. */}
      <span aria-hidden className="mt-auto flex flex-col gap-px">
        {income > 0 && (
          <span className="num truncate text-center text-cal text-income">
            +{formatMoneyCell(income)}
          </span>
        )}
        {expense > 0 && (
          <span className="num truncate text-center text-cal text-expense">
            −{formatMoneyCell(expense)}
          </span>
        )}
        {/* Khoản chưa điền tiền không có số nào để in, nhưng ngày đó VẪN CÓ ghi
            chép — nên nó phải để lại một dấu. Không có dấu này thì ô lịch của
            ngày ấy trống y như ngày chưa ghi gì. Dấu "?" chứ không phải một con
            số: đúng cái đang thiếu là con số. */}
        {unknown > 0 && (
          <span className="truncate text-center text-cal text-warning">
            {unknown > 1 ? `${unknown}×?` : "?"}
          </span>
        )}
      </span>
    </button>
  );
}
