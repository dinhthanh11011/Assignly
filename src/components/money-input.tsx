"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn, formatMoneyInput, formatMoneyShort, parseMoney } from "@/lib/utils";

/**
 * Ô nhập tiền VND: hiển thị có dấu chấm phân cách ("1.250.000") nhưng trả về số
 * nguyên cho `onValueChange`.
 */
export function MoneyInput({
  value,
  onValueChange,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="relative">
      <Input
        {...props}
        inputMode="numeric"
        autoComplete="off"
        value={value ? formatMoneyInput(String(value)) : ""}
        onChange={(e) => onValueChange(parseMoney(e.target.value))}
        className={cn("num pr-10 text-right text-lg font-semibold", className)}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
        ₫
      </span>
    </div>
  );
}

const QUICK = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];

/**
 * Khối nhập số tiền chính của các form: con số cỡ lớn, tô theo loại thu/chi, kèm
 * các mức bấm nhanh cộng dồn.
 */
export function AmountField({
  value,
  onValueChange,
  type = "EXPENSE",
  autoFocus,
}: {
  value: number;
  onValueChange: (value: number) => void;
  type?: "INCOME" | "EXPENSE";
  autoFocus?: boolean;
}) {
  const tone = type === "INCOME" ? "text-income" : "text-expense";

  return (
    <div className="space-y-2.5 rounded-lg bg-sunken p-4">
      <div className="flex items-baseline justify-center gap-1.5">
        <span className={cn("text-sm font-semibold", tone)}>{type === "INCOME" ? "+" : "−"}</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-label="Số tiền"
          placeholder="0"
          value={value ? formatMoneyInput(String(value)) : ""}
          onChange={(e) => onValueChange(parseMoney(e.target.value))}
          className={cn(
            "num-lg w-full min-w-0 border-0 bg-transparent p-0 text-center text-4xl font-bold outline-none placeholder:text-muted-foreground/40",
            tone
          )}
        />
        <span className={cn("text-lg font-semibold", tone)}>₫</span>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {QUICK.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onValueChange(value + a)}
            className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-soft transition-colors hover:text-primary"
          >
            +{formatMoneyShort(a)}
          </button>
        ))}
        {value > 0 && (
          <button
            type="button"
            onClick={() => onValueChange(0)}
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-expense"
          >
            Xoá
          </button>
        )}
      </div>
    </div>
  );
}
