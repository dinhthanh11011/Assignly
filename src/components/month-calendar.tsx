"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useNavTransition } from "@/components/nav-progress";
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

/** Đổi URL hiện tại, dùng cho từng ô lịch. */
function useSetParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useNavTransition();

  const setParams = (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  return [setParams, pending] as const;
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
 * một ngày là số ĐẦY ĐỦ hiện ngay dưới lịch ở cỡ chữ thường (có co giãn), cùng
 * lúc danh sách bên dưới thu về ngày đó.
 *
 * Tuần bắt đầu từ CHỦ NHẬT, cột CN đỏ và T7 xanh — quy ước của lịch giấy Việt
 * Nam. Màu cuối tuần thuần trang trí: vị trí cột và nhãn CN/T7 đã nói đủ.
 */
export function MonthCalendar({
  month,
  days,
  selected,
}: {
  month: string;
  days: DayTotals[];
  selected?: string;
}) {
  const [setParams, pending] = useSetParams();
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const shown = pending && optimistic !== null ? optimistic || undefined : selected;

  const byDay = new Map(days.map((d) => [d.day, d]));
  const weeks = monthWeeks(month);
  const todayKey = dateKey(today());
  const busiest = days.reduce<DayTotals | null>(
    (top, d) => (d.expense > (top?.expense ?? 0) ? d : top),
    null
  );
  const selectedTotals = shown ? byDay.get(shown) : undefined;

  const pick = (day: string) => {
    const next = day === shown ? "" : day;
    setOptimistic(next);
    setParams({ day: next || null });
  };

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
                  selected={day === shown}
                  isToday={day === todayKey}
                  onPick={() => pick(day)}
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
        <span>Số trong ô đã rút gọn — bấm một ngày để xem số đầy đủ.</span>
      </p>

      {/* Số chính xác sống ở ĐÂY, cỡ chữ thường — không nhồi vào ô lịch. */}
      <div className="mt-2.5 border-t border-border px-1 pt-3">
        {shown ? (
          <div className="space-y-2">
            <p className="text-body-lg">
              {formatWeekday(shown)}, {formatDate(shown)}
              {shown === todayKey && " (hôm nay)"}
            </p>
            {selectedTotals ? (
              <p className="num text-body">
                {selectedTotals.expense > 0 && (
                  <span className="text-expense">Tiền ra {formatMoney(selectedTotals.expense)}</span>
                )}
                {selectedTotals.expense > 0 && selectedTotals.income > 0 && " · "}
                {selectedTotals.income > 0 && (
                  <span className="text-income">Tiền vào {formatMoney(selectedTotals.income)}</span>
                )}
                <span className="text-muted-foreground">
                  {" "}
                  · {selectedTotals.count} khoản
                </span>
              </p>
            ) : (
              <p className="text-body text-muted-foreground">Ngày này chưa ghi khoản nào.</p>
            )}
            <button
              type="button"
              onClick={() => pick(shown)}
              className="min-h-11 text-body text-primary underline underline-offset-4"
            >
              Xem lại cả tháng
            </button>
          </div>
        ) : (
          <div className="space-y-1">
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
        )}
      </div>
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
    selected ? "đang xem ngày này, bấm lại để xem cả tháng" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onPick}
      className={cn(
        "flex min-h-[68px] flex-col items-stretch overflow-hidden rounded-md border py-1 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
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
