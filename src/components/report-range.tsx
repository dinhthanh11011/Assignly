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
import { ChoiceGroup } from "@/components/ui/choice-group";
import {
  MONTH_PRESETS,
  monthAsRange,
  monthsAsRange,
  rangeLabel,
  rangeParams,
  rangeSentence,
  type RangeMode,
  type ReportRange,
} from "@/lib/range";
import { currentMonth, dateKey, formatMonth, shiftMonth, today } from "@/lib/utils";

/**
 * Bộ chọn khoảng thời gian của trang Báo cáo: ba kiểu (một tháng / N tháng gần
 * đây / tự chọn ngày) trên một khay segment, bên dưới là điều khiển riêng của
 * kiểu đang chọn, và luôn có MỘT CÂU nói rõ đang tính từ ngày nào tới ngày nào.
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
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const goMonth = (delta: number) => {
    const base = shown.mode === "month" ? shown.month! : currentMonth();
    apply(monthAsRange(shiftMonth(base, delta)));
  };

  const onMode = (mode: RangeMode) => {
    if (mode === shown.mode) return;
    if (mode === "month") apply(monthAsRange(currentMonth()));
    else if (mode === "months") apply(monthsAsRange(MONTH_PRESETS[0]));
    // "Tự chọn" chỉ đổi khi người dùng bấm "Xem khoảng này" trong sheet.
    else setSheetOpen(true);
  };

  return (
    <div className="space-y-3">
      <ChoiceGroup<RangeMode>
        label="Kiểu khoảng thời gian"
        value={shown.mode}
        onChange={onMode}
        pending={pending}
        pendingLabel="Đang tính lại báo cáo"
        options={[
          { value: "month", label: "Tháng" },
          { value: "months", label: "Vài tháng" },
          { value: "custom", label: "Tự chọn" },
        ]}
      />

      {shown.mode === "month" && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-1">
          <StepButton label="Tháng trước" onClick={() => goMonth(-1)}>
            <ChevronLeft className="size-6" />
          </StepButton>
          {/* Nhãn tháng mở lưới tháng — cùng cử chỉ với trang Sổ. */}
          <button
            type="button"
            onClick={() => setMonthPickerOpen(true)}
            aria-haspopup="dialog"
            className="focus-ring flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-body-lg transition-colors hover:bg-sunken"
          >
            <CalendarDays className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{formatMonth(shown.month!)}</span>
            {pending && <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden />}
          </button>
          <StepButton label="Tháng sau" onClick={() => goMonth(1)}>
            <ChevronRight className="size-6" />
          </StepButton>
        </div>
      )}

      {shown.mode === "months" && (
        <ChoiceGroup<string>
          label="Số tháng gần đây"
          variant="chip"
          value={String(shown.months)}
          onChange={(v) => apply(monthsAsRange(Number(v)))}
          options={MONTH_PRESETS.map((m) => ({ value: String(m), label: `${m} tháng gần đây` }))}
        />
      )}

      {shown.mode === "custom" && (
        <Button variant="outline" className="w-full justify-between" onClick={() => setSheetOpen(true)}>
          <span className="flex min-w-0 items-center gap-2">
            <CalendarRange aria-hidden />
            <span className="truncate">{rangeLabel(shown)}</span>
          </span>
          <span className="text-primary">Đổi ngày</span>
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
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="focus-ring flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
      className="focus-ring min-h-11 rounded-lg border border-input bg-card px-4 text-label text-foreground transition-colors hover:bg-sunken"
    >
      {label}
    </button>
  );
}
