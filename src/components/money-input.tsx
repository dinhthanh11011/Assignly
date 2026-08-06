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
        className={cn("num pr-10 text-right text-title font-bold", className)}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-body font-medium text-muted-foreground">
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
    <div className="space-y-3 overflow-hidden rounded-xl border border-border bg-sunken p-4">
      <div className="flex items-baseline justify-center gap-1.5">
        <span className={cn("text-title font-bold", tone)}>{type === "INCOME" ? "+" : "−"}</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-label="Số tiền"
          placeholder="0"
          value={value ? formatMoneyInput(String(value)) : ""}
          onChange={(e) => onValueChange(parseMoney(e.target.value))}
          className={cn(
            // field-sizing-content: ô co theo số đã nhập nên dấu −/₫ luôn dính sát
            // con số thay vì bị đẩy ra hai mép. clamp giữ số lớn không tràn sheet.
            "num min-w-8 max-w-full border-0 bg-transparent p-0 text-center text-money-hero font-bold leading-tight outline-none field-sizing-content placeholder:text-muted-foreground",
            tone
          )}
        />
        <span className={cn("text-title font-bold", tone)}>₫</span>
      </div>

      {/* Các nút này CỘNG THÊM vào số đang có chứ không thay thế nó. Bản cũ
          không nói ra điều đó ở đâu cả, nên bấm hai lần "+50K" ra 100K là
          chuyện thường xuyên gây nhập sai. */}
      <p className="text-center text-caption text-muted-foreground">Bấm để cộng thêm:</p>
      <div className="scroll-fade -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {QUICK.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onValueChange(value + a)}
            className="min-h-11 shrink-0 rounded-lg border border-input bg-card px-4 text-label text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            +{formatMoneyShort(a)}
          </button>
        ))}
        {value > 0 && (
          <button
            type="button"
            onClick={() => onValueChange(0)}
            className="min-h-11 shrink-0 rounded-lg px-4 text-label text-muted-foreground transition-colors hover:text-expense"
          >
            Nhập lại
          </button>
        )}
      </div>
    </div>
  );
}
