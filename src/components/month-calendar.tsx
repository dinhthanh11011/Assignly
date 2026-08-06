"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, List, Loader2 } from "lucide-react";
import { useNavTransition } from "@/components/nav-progress";
import type { DayTotals } from "@/lib/queries";
import {
  WEEKDAY_LABELS,
  cn,
  dateKey,
  formatDate,
  formatDayShort,
  formatMoney,
  formatMonth,
  formatWeekday,
  monthWeeks,
  today,
} from "@/lib/utils";

export type LedgerView = "list" | "calendar";

/** Đổi URL hiện tại, dùng chung cho nút đổi cách xem và cho từng ô lịch. */
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
 * Chọn cách xem cuốn sổ: danh sách hay lịch.
 *
 * Hai cách xem, không phải hai trang: cùng một tháng, cùng một bộ lọc, chỉ khác
 * hình dạng. Trạng thái nằm trên URL (`?view=lich`) nên tải lại trang hay chia
 * sẻ link vẫn đúng cách xem đó.
 */
export function LedgerViewSwitch({ view }: { view: LedgerView }) {
  const [setParams, pending] = useSetParams();
  const [optimistic, setOptimistic] = useState<LedgerView | null>(null);
  const shown = pending && optimistic ? optimistic : view;

  const pick = (next: LedgerView) => {
    if (next === shown) return;
    setOptimistic(next);
    // Đổi cách xem thì bỏ ngày đang chọn: ngày đó chỉ chọn được từ trong lịch,
    // giữ lại khi về danh sách sẽ thành một bộ lọc không rõ từ đâu ra.
    setParams({ view: next === "calendar" ? "lich" : null, day: null });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Xem sổ dạng danh sách hay dạng lịch"
      className="flex gap-1.5 rounded-full border-[1.5px] border-border bg-sunken p-1.5"
    >
      {(
        [
          { value: "list", label: "Danh sách", icon: List },
          { value: "calendar", label: "Lịch tháng", icon: CalendarDays },
        ] as const
      ).map((o) => {
        const active = o.value === shown;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => pick(o.value)}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-2 text-body transition-colors",
              active
                ? "bg-card font-bold text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <o.icon className="size-5 shrink-0" />
            <span className="truncate">{o.label}</span>
            {pending && active && <Loader2 className="size-4 shrink-0 animate-spin" />}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Lịch một tháng: mỗi ô là một ngày, cao thấp theo mức tiền của ngày đó.
 *
 * Vì sao có lịch bên cạnh danh sách: danh sách trả lời "tôi đã tiêu những gì",
 * còn lịch trả lời "tôi tiêu đậm vào những ngày nào" — nhìn 30 ô cạnh nhau là
 * thấy ngay cuối tuần đắt hơn ngày thường, hay đầu tháng tiêu dồn. Đây cũng là
 * cách người dùng đối chiếu với cuốn sổ giấy, vốn cũng kẻ theo ngày.
 *
 * TRONG Ô KHÔNG CÓ SỐ TIỀN — và đó là chủ ý, không phải bỏ sót. Bảy cột chia bề
 * ngang điện thoại ra thành ô rộng ~44px, mà cỡ chữ nhỏ nhất app cho phép là
 * 14px và người dùng còn tự tăng được lên ~19px (fs-xl). Ở đó "−2,4tr" không có
 * cách nào vừa: bản đầu tiên của lịch này in số vào ô và người dùng nhận được
 * "−2…" — tức là một con số bị cắt còn tệ hơn không có số, vì nó trông như thông
 * tin mà đọc không ra.
 *
 * Nên ô giữ đúng hai thứ ĐỌC ĐƯỢC ở mọi cỡ chữ: số ngày, và hai vạch cao thấp
 * (tiền ra bên trái, tiền vào bên phải) so trên cùng một thang của cả tháng.
 * Còn SỐ CHÍNH XÁC thì luôn có, ở cỡ chữ thường: bấm một ngày là nó hiện ngay
 * dưới lịch thành câu, cùng lúc danh sách bên dưới thu về ngày đó.
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
  // HAI thang riêng, một cho tiền ra và một cho tiền vào — KHÔNG dùng chung.
  // Dùng chung thì một lần lãnh lương 12 triệu ép mọi vạch tiền ra của cả tháng
  // xuống còn 3–4px, tức là đúng thứ người dùng muốn so (ngày nào tiêu đậm) thì
  // không so được nữa. Đổi lại, vạch đỏ và vạch xanh không so với nhau — chấp
  // nhận được, vì "hôm đó thu nhiều hơn chi không" là câu trả lời của con số bên
  // dưới lịch, không phải của hai cái vạch.
  const expensePeak = Math.max(1, ...days.map((d) => d.expense));
  const incomePeak = Math.max(1, ...days.map((d) => d.income));
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

  return (
    <section
      aria-label={`Lịch thu chi ${formatMonth(month).toLowerCase()}`}
      className="rounded-xl border-[1.5px] border-border bg-card p-2.5 shadow-soft sm:p-3.5"
    >
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="pb-1 text-center text-caption text-muted-foreground">
            {label}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {week.map((day, j) =>
              day === null ? (
                <span key={j} aria-hidden />
              ) : (
                <DayCell
                  key={day}
                  day={day}
                  totals={byDay.get(day)}
                  expensePeak={expensePeak}
                  incomePeak={incomePeak}
                  selected={day === shown}
                  isToday={day === todayKey}
                  onPick={() => pick(day)}
                />
              )
            )}
          </div>
        ))}
      </div>

      {/* Chú giải: hai vạch mang màu, nên phải có chỗ nói ra bằng CHỮ màu nào là
          gì — nếu không thì đó là thông tin chỉ do màu mang. */}
      <p className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 px-1 text-caption text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3.5 w-2 rounded-sm bg-expense" />
          Tiền ra
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3.5 w-2 rounded-sm bg-income" />
          Tiền vào
        </span>
        <span>Vạch càng cao thì ngày đó càng nhiều tiền, so trong cùng một tháng.</span>
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

function DayCell({
  day,
  totals,
  expensePeak,
  incomePeak,
  selected,
  isToday,
  onPick,
}: {
  day: string;
  totals?: DayTotals;
  expensePeak: number;
  incomePeak: number;
  selected: boolean;
  isToday: boolean;
  onPick: () => void;
}) {
  const dayNumber = Number(day.slice(8));
  const expense = totals?.expense ?? 0;
  const income = totals?.income ?? 0;

  // Vạch cao 8–28px. Sàn 8px (không phải 2–3px) để một ngày CÓ TIỀN không bao giờ
  // trông như ngày trống, dù nó bé xíu so với ngày đậm nhất tháng — bản trước lấy
  // sàn 4px và những ngày lẻ tẻ đọc ra như hạt bụi. Đơn vị px (không rem) vì đây
  // là hình vẽ so sánh: nó không được cao lên theo cỡ chữ rồi đội vỡ ô.
  const barHeight = (value: number, peak: number) =>
    value > 0 ? `${Math.round(8 + (value / peak) * 20)}px` : "0px";

  // Ô không có chữ nào ngoài số ngày, nên nhãn đọc-màn-hình phải nói ĐỦ.
  const label = [
    `${formatWeekday(day)} ${formatDate(day)}`,
    isToday ? "hôm nay" : null,
    expense > 0 ? `tiền ra ${formatMoney(expense)}` : null,
    income > 0 ? `tiền vào ${formatMoney(income)}` : null,
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
        "flex min-h-[76px] flex-col items-center gap-1 overflow-hidden rounded-md border-[1.5px] px-0.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary-surface"
          : isToday
            ? "border-border-strong bg-card hover:bg-sunken"
            : "border-transparent bg-sunken hover:border-border-strong"
      )}
    >
      <span
        className={cn(
          "num text-body",
          selected ? "font-bold text-primary" : isToday ? "font-bold text-foreground" : ""
        )}
      >
        {dayNumber}
      </span>

      {/* Hai vạch: tiền ra LUÔN bên trái, tiền vào LUÔN bên phải — vị trí là dấu
          hiệu thứ hai bên cạnh màu, và chú giải bằng chữ nằm dưới lịch. */}
      <span aria-hidden className="mt-auto flex h-[28px] items-end justify-center gap-1">
        {expense > 0 && (
          <span
            className="w-2.5 rounded-sm bg-expense"
            style={{ height: barHeight(expense, expensePeak) }}
          />
        )}
        {income > 0 && (
          <span
            className="w-2.5 rounded-sm bg-income"
            style={{ height: barHeight(income, incomePeak) }}
          />
        )}
      </span>
    </button>
  );
}
