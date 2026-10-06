"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { MonthPickerDialog } from "@/components/month-picker";
import { useNavTransition } from "@/components/nav-progress";
import { Amount } from "@/components/ui/amount";
import { cn, formatMonth, shiftMonth } from "@/lib/utils";

/** Biến CSS mang chiều cao thanh tháng — tiêu đề ngày bên dưới dính ngay dưới nó. */
export const LEDGER_HEAD_VAR = "--ledger-head";

/**
 * Thanh tháng DÍNH ở đầu trang Sổ: ‹ Tháng 10/2026 › + tiền vào / ra / còn lại
 * của tháng (theo bộ lọc đang bật — cùng tập khoản với lịch và danh sách).
 *
 * Cuộn sâu trong danh sách vẫn thấy đang ở tháng nào và tháng đó ra sao. Chiều
 * cao của thanh được ghi vào `--ledger-head` trên <html> để tiêu đề ngày của
 * `TransactionList` dính ngay bên dưới (đổi theo cỡ chữ, xuống dòng…).
 */
export function MonthStrip({
  month,
  income,
  expense,
  unknown = 0,
  filtered = false,
}: {
  month: string;
  income: number;
  expense: number;
  /** Số khoản chưa điền tiền — không vào tổng nào, phải nói ra. */
  unknown?: number;
  /** Đang lọc/tìm — tổng chỉ là của phần đang lọc. */
  filtered?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useNavTransition();
  // Hiện ngay tháng vừa bấm rồi mới chờ server — bấm liên tiếp vẫn nhảy mượt.
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const shown = pending && optimistic ? optimistic : month;
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const set = () => root.style.setProperty(LEDGER_HEAD_VAR, `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty(LEDGER_HEAD_VAR);
    };
  }, []);

  const goTo = (next: string) => {
    setOptimistic(next);
    const sp = new URLSearchParams(params.toString());
    sp.set("month", next);
    startTransition(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }));
  };
  const go = (delta: number) => goTo(shiftMonth(shown, delta));
  const net = income - expense;

  return (
    <section
      ref={ref}
      aria-label={`${formatMonth(shown)}${filtered ? " (đang lọc)" : ""}`}
      className={cn(
        // Dính ngay dưới thanh trên (h-16 + vùng an toàn); dưới 22em thanh trên
        // cao hai hàng — cùng ngưỡng với .day-sticky trong globals.css.
        "sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-1 bg-background px-1 pb-2 pt-1 @max-[22em]/app:top-[calc(7.5rem+env(safe-area-inset-top))]",
        pending && "opacity-80"
      )}
    >
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-1 p-1">
          <StepButton label="Tháng trước" onClick={() => go(-1)}>
            <ChevronLeft className="size-6" aria-hidden />
          </StepButton>
          {/* Nhãn tháng là NÚT: nhảy xa (tháng 3 năm ngoái) bằng lưới tháng. */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-haspopup="dialog"
            aria-label={`${formatMonth(shown)} — chọn tháng khác`}
            className="focus-ring flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-title transition-colors duration-150 hover:bg-sunken"
          >
            <span className="truncate">{formatMonth(shown)}</span>
            {pending ? (
              <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden />
            ) : (
              <ChevronDown className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </button>
          <StepButton label="Tháng sau" onClick={() => go(1)}>
            <ChevronRight className="size-6" aria-hidden />
          </StepButton>
        </div>

        {/* Ba con số, rút gọn ("1,2 tr"): thanh dính, ba cột trên màn 320px ×
            chữ lớn. Số đầy đủ ở sheet của từng ngày và trang Báo cáo. */}
        <dl className="grid grid-cols-3 divide-x divide-border border-t border-border">
          <Figure label="Vào" value={<Amount value={income} tone="income" size="body" short />} />
          <Figure label="Ra" value={<Amount value={-expense} tone="expense" size="body" short />} />
          <Figure label="Còn lại" value={<Amount value={net} size="body" short />} />
        </dl>
        {(filtered || unknown > 0) && (
          <p className="border-t border-border px-3 py-1.5 text-caption text-muted-foreground">
            {filtered && "Tổng của các khoản đang lọc"}
            {filtered && unknown > 0 && " · "}
            {unknown > 0 && `chưa tính ${unknown} khoản chưa điền số tiền`}
          </p>
        )}
      </div>

      <MonthPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} month={shown} onSelect={goTo} />
    </section>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 px-2 py-2 text-center">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="truncate">{value}</dd>
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
      className="focus-ring flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-sunken hover:text-foreground"
    >
      {children}
    </button>
  );
}
