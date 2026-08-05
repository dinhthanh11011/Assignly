"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatMonth, shiftMonth } from "@/lib/utils";

/** Đặt/xoá tham số trên URL hiện tại rồi điều hướng tới đó. */
function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) sp.delete(key);
      else sp.set(key, value);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
}

/** Chọn sổ đang xem (giữ nguyên các bộ lọc khác trên URL). */
export function GroupPicker({
  groups,
  current,
}: {
  groups: { id: string; name: string }[];
  current: string;
}) {
  const setParam = useSetParam();
  if (groups.length < 2) return null;

  return (
    <Select value={current} onValueChange={(v) => setParam({ group: v })}>
      <SelectTrigger className="h-9 w-auto min-w-40 text-[13px]">
        <Wallet className="size-4 shrink-0 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Chuyển tháng trước / tháng sau. */
export function MonthPicker({ month }: { month: string }) {
  const setParam = useSetParam();

  return (
    <div className="flex h-9 items-center gap-0.5 rounded-md border border-border/70 bg-card p-0.5 shadow-soft">
      <button
        type="button"
        aria-label="Tháng trước"
        onClick={() => setParam({ month: shiftMonth(month, -1) })}
        className="flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-[6.5rem] text-center text-[13px] font-semibold">
        {formatMonth(month)}
      </span>
      <button
        type="button"
        aria-label="Tháng sau"
        onClick={() => setParam({ month: shiftMonth(month, 1) })}
        className="flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

/** Bộ lọc dạng chip trên URL (loại giao dịch, trạng thái khoản vay, khoảng thời gian…). */
export function FilterChips({
  param,
  value,
  options,
  className,
}: {
  param: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const setParam = useSetParam();

  return (
    <div className={cn("no-scrollbar flex gap-1.5 overflow-x-auto", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setParam({ [param]: o.value || null })}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
            o.value === value
              ? "bg-primary text-primary-foreground shadow-soft"
              : "bg-sunken text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
