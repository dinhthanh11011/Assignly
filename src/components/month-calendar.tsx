"use client";
import { useState } from "react";
import { DayDetailDialog } from "@/components/day-detail-dialog";
import type { MemberOption } from "@/lib/member";
import type { DayTotals } from "@/lib/queries";
import {
  WEEKDAY_LABELS,
  WEEKEND_COLUMNS,
  cn,
  dateKey,
  formatDate,
  formatDayShort,
  formatMoney,
  formatMoneyCell,
  formatMonth,
  formatWeekday,
  monthWeeks,
  today,
} from "@/lib/utils";

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
  groupId,
  members,
  filter,
}: {
  month: string;
  days: DayTotals[];
  groupId: string;
  members: MemberOption[];
  /** Bộ lọc đang bật của trang — sheet phải đếm cùng tập khoản với ô lịch. */
  filter: { type?: "INCOME" | "EXPENSE"; categoryId?: string; q?: string };
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);

  const byDay = new Map(days.map((d) => [d.day, d]));
  const weeks = monthWeeks(month);
  const todayKey = dateKey(today());
  const busiest = days.reduce<DayTotals | null>(
    (top, d) => (d.expense > (top?.expense ?? 0) ? d : top),
    null
  );

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

      {/* Dải chân lịch giờ chỉ còn lời mời bấm + một câu về ngày tiêu đậm nhất:
          số chính xác của từng ngày đã chuyển hẳn vào sheet. */}
      <div className="mt-2.5 space-y-1 border-t border-border px-1 pt-3">
        <p className="text-body text-muted-foreground">
          Bấm một ngày để xem những khoản của riêng ngày đó.
        </p>
        {busiest && busiest.expense > 0 && (
          <p className="text-body">
            Tiêu nhiều nhất là {formatWeekday(busiest.day).toLowerCase()}{" "}
            {formatDayShort(busiest.day)} —{" "}
            <span className="num text-expense">{formatMoney(busiest.expense)}</span>
          </p>
        )}
      </div>

      {/* Giữ `openDay` cả khi sheet đang đóng lại thì Radix mất hoạt ảnh đóng,
          nên chỉ dọn state sau khi sheet báo đã đóng. */}
      {openDay && (
        <DayDetailDialog
          key={openDay}
          groupId={groupId}
          day={openDay}
          filter={filter}
          members={members}
          open
          onOpenChange={(o) => !o && setOpenDay(null)}
        />
      )}
    </section>
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
}: {
  day: string;
  totals?: DayTotals;
  weekend: string | null;
  selected: boolean;
  isToday: boolean;
  onPick: () => void;
}) {
  const dayNumber = Number(day.slice(8));
  const expense = totals?.expense ?? 0;
  const income = totals?.income ?? 0;

  // Số trong ô là số RÚT GỌN. Nhãn đọc-màn-hình phải đọc số đầy đủ, không đọc
  // "cộng một phẩy hai tê e-rờ".
  const label = [
    `${formatWeekday(day)} ${formatDate(day)}`,
    isToday ? "hôm nay" : null,
    income > 0 ? `tiền vào ${formatMoney(income)}` : null,
    expense > 0 ? `tiền ra ${formatMoney(expense)}` : null,
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
      </span>
    </button>
  );
}
