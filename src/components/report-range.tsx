"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { MonthPickerDialog } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/date-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavTransition } from "@/components/nav-progress";
import {
  MONTH_PRESETS,
  monthAsRange,
  monthsAsRange,
  rangeLabel,
  rangeParams,
  rangeSentence,
  type ReportRange,
} from "@/lib/range";
import { cn, currentMonth, dateKey, formatMonth, shiftMonth, today } from "@/lib/utils";

/**
 * Bộ chọn khoảng thời gian của trang Báo cáo.
 *
 * Bản cũ chỉ có ba chip "3 tháng / 6 tháng / 12 tháng". Ba lựa chọn đó trả lời
 * được đúng một câu hỏi — "gần đây thế nào" — nhưng câu người dùng hỏi nhiều
 * nhất lại là "THÁNG 6 tôi tiêu vào những gì", và không có cách nào hỏi. Nay có
 * ba kiểu, xếp theo mức cụ thể giảm dần:
 *
 *   · Từng tháng   — chuyển tháng bằng ‹ › như trang Ghi chép
 *   · N tháng gần  — giữ lại ba chip cũ, vẫn là cách xem xu hướng nhanh nhất
 *   · Chọn ngày    — hai ô ngày, cho những khoảng không trùng tháng (chuyến đi,
 *                    một đợt sửa nhà, từ lúc bắt đầu ghi sổ tới nay)
 *
 * Dù chọn kiểu nào thì bên dưới cũng luôn có MỘT CÂU nói rõ đang tính từ ngày
 * nào tới ngày nào. Không có câu đó thì "6 tháng gần đây" là một lời hứa không
 * kiểm được — nhất là khi các con số đằng sau nó rất giống nhau giữa hai khoảng.
 */
export function ReportRangePicker({ range }: { range: ReportRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useNavTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  // Kiểu vừa bấm sáng lên ngay, chưa cần chờ server dựng lại cả trang báo cáo.
  const [optimistic, setOptimistic] = useState<ReportRange | null>(null);
  const shown = pending && optimistic ? optimistic : range;

  const apply = (next: ReportRange) => {
    setOptimistic(next);
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(rangeParams(next))) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  const goMonth = (delta: number) => {
    const base = shown.mode === "month" ? shown.month! : currentMonth();
    apply(monthAsRange(shiftMonth(base, delta)));
  };

  // "Chọn ngày" đứng ĐẦU hàng: nó là lựa chọn duy nhất mở ra một sheet (các chip
  // còn lại đổi trang ngay), và là thứ người dùng phải tìm thấy chứ không phải
  // thứ họ lướt qua — nằm cuối một hàng cuộn ngang thì ở cỡ chữ lớn nó bị cắt
  // khỏi mép phải, đúng cái chip khó đoán nhất lại là cái bị giấu.
  const chips: { key: string; label: string; active: boolean; onClick: () => void }[] = [
    {
      key: "custom",
      label: "Chọn ngày",
      active: shown.mode === "custom",
      onClick: () => setSheetOpen(true),
    },
    {
      key: "month",
      label: "Từng tháng",
      active: shown.mode === "month",
      // Vào chế độ từng tháng thì bắt đầu ở tháng này — tháng người dùng đang sống
      // trong đó, và cũng là tháng họ nhớ rõ nhất để đối chiếu.
      onClick: () => apply(monthAsRange(shown.mode === "month" ? shown.month! : currentMonth())),
    },
    ...MONTH_PRESETS.map((m) => ({
      key: String(m),
      label: `${m} tháng`,
      active: shown.mode === "months" && shown.months === m,
      onClick: () => apply(monthsAsRange(m)),
    })),
  ];

  return (
    <div className="space-y-2.5">
      {/* Cuộn ngang được, nhưng năm chip vừa một hàng ở cỡ chữ mặc định trên máy
          360px — cuộn chỉ là lối thoát cho cỡ chữ lớn nhất. */}
      <div className="scroll-fade flex gap-1.5 overflow-x-auto pb-0.5">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={c.active}
            onClick={c.onClick}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-4 text-label transition-colors",
              c.active
                ? "bg-primary text-primary-foreground"
                : "bg-sunken text-muted-foreground hover:text-foreground"
            )}
          >
            {c.key === "custom" && <CalendarRange className="size-4 shrink-0" />}
            {c.label}
            {pending && c.active && <Loader2 className="size-4 shrink-0 animate-spin" />}
          </button>
        ))}
      </div>

      {/* Chế độ từng tháng: ‹ › ngay dưới chip, dáng giống dải tháng ở trang Ghi
          chép để cùng một cử chỉ dùng được ở cả hai trang. */}
      {shown.mode === "month" && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-1">
          <StepButton label="Tháng trước" onClick={() => goMonth(-1)}>
            <ChevronLeft className="size-6" />
          </StepButton>
          {/* Nhãn tháng mở lưới tháng — giống trang Ghi chép, để cùng một cử
              chỉ dùng được ở cả hai nơi. */}
          <button
            type="button"
            onClick={() => setMonthPickerOpen(true)}
            aria-haspopup="dialog"
            className="focus-ring flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-body-lg transition-colors hover:bg-sunken"
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{formatMonth(shown.month!)}</span>
            {pending && <Loader2 className="size-5 shrink-0 animate-spin text-primary" />}
          </button>
          <StepButton label="Tháng sau" onClick={() => goMonth(1)}>
            <ChevronRight className="size-6" />
          </StepButton>
        </div>
      )}

      {shown.mode === "custom" && (
        <Button variant="outline" className="w-full" onClick={() => setSheetOpen(true)}>
          <CalendarRange /> {rangeLabel(shown)} — đổi ngày
        </Button>
      )}

      <p className="text-caption text-muted-foreground">{rangeSentence(shown)}</p>

      <MonthPickerDialog
        open={monthPickerOpen}
        onOpenChange={setMonthPickerOpen}
        month={shown.mode === "month" ? shown.month! : currentMonth()}
        onSelect={(m) => apply(monthAsRange(m))}
      />

      <CustomRangeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={shown}
        onApply={(from, to) => {
          setSheetOpen(false);
          apply({ mode: "custom", from, until: to });
        }}
      />
    </div>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="focus-ring flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
    >
      {children}
    </button>
  );
}

/**
 * Sheet chọn ngày đầu / ngày cuối.
 *
 * Không chặn "ngày đầu sau ngày cuối" bằng thông báo lỗi: hai ngày bị đổi chỗ là
 * ý muốn đọc ra được, và `resolveRange` tự xếp lại. Chỉ có một điều kiện thật —
 * phải điền cả hai ô.
 */
function CustomRangeSheet({
  open,
  onOpenChange,
  initial,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ReportRange;
  onApply: (from: string, to: string) => void;
}) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.until);

  // Mở lại sheet thì luôn bắt đầu từ khoảng đang xem, không phải khoảng gõ dở
  // của lần trước.
  const reset = (next: boolean) => {
    if (next) {
      setFrom(initial.from);
      setTo(initial.until);
    }
    onOpenChange(next);
  };

  const todayKey = dateKey(today());

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chọn khoảng ngày</DialogTitle>
          <DialogDescription>
            Xem lại đúng một quãng thời gian bạn muốn — một chuyến đi, một đợt sửa nhà, hay từ đầu
            năm tới nay.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <DateField id="range-from" label="Từ ngày" value={from} onChange={setFrom} required />
          <DateField id="range-to" label="Đến ngày" value={to} onChange={setTo} required />

          <div className="flex flex-wrap gap-2">
            <QuickRange
              label="Từ đầu tháng tới nay"
              onClick={() => {
                setFrom(`${currentMonth()}-01`);
                setTo(todayKey);
              }}
            />
            <QuickRange
              label="Từ đầu năm tới nay"
              onClick={() => {
                setFrom(`${todayKey.slice(0, 4)}-01-01`);
                setTo(todayKey);
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => reset(false)}>
            Thôi, để sau
          </Button>
          <Button disabled={!from || !to} onClick={() => onApply(from, to)}>
            Xem khoảng này
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickRange({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-lg bg-sunken px-4 text-label text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
    </button>
  );
}
