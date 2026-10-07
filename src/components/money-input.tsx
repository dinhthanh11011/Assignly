"use client";
import * as React from "react";
import { CircleHelp, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UNKNOWN_AMOUNT_LONG } from "@/lib/copy";
import { cn, formatMoney, formatMoneyInput, formatMoneyShort, parseMoney } from "@/lib/utils";

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
 * Ô số tiền chính của các form: con số cỡ hero, tô theo chiều thu/chi, kèm hàng
 * bấm nhanh và lối "chưa biết số tiền".
 *
 * - Gõ một số ngắn (< 1.000) là hiện gợi ý ×1.000 / ×10.000 / ×100.000: không
 *   khoản tiền Việt nào dưới 1.000 ₫, gõ đủ "000" là sáu cú chạm.
 * - Ngoài lúc đó là hàng "+10K…" CỘNG DỒN (nhãn nói rõ là cộng thêm).
 * - "Chưa biết số tiền" nằm ngay tại ô: người mở form thường đang bí đúng câu này.
 */
export function AmountField({
  id = "amount",
  value,
  onValueChange,
  type = "EXPENSE",
  invalid,
  describedBy,
  amountUnknown = false,
  onAmountUnknownChange,
  onBlur,
}: {
  /** Phải trùng khoá luật của useValidation — check() tìm ô bằng getElementById. */
  id?: string;
  value: number;
  onValueChange: (value: number) => void;
  /** NEUTRAL: chuyển tiền giữa người với người (cân đối) — không dấu, không màu thu/chi. */
  type?: "INCOME" | "EXPENSE" | "NEUTRAL";
  invalid?: boolean;
  describedBy?: string;
  /** Đang ghi một khoản CHƯA BIẾT số tiền — ô nhập nhường chỗ cho lời hẹn. */
  amountUnknown?: boolean;
  /** Bỏ trống = không cho chuyển sang "chưa biết" ở form này (VD: màn điền tiền). */
  onAmountUnknownChange?: (amountUnknown: boolean) => void;
  /** Rời ô số tiền — để form chấm lỗi lúc blur. */
  onBlur?: () => void;
}) {
  const tone = type === "INCOME" ? "text-income" : type === "EXPENSE" ? "text-expense" : "text-foreground";
  const suggestions = value > 0 && value < 1_000 ? [1_000, 10_000, 100_000].map((m) => value * m) : null;

  const toggle = onAmountUnknownChange && (
    <button
      type="button"
      onClick={() => onAmountUnknownChange(!amountUnknown)}
      aria-pressed={amountUnknown}
      className="focus-ring mx-auto flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-label text-muted-foreground transition-colors duration-150 hover:bg-card hover:text-foreground"
    >
      {amountUnknown ? (
        <>
          <Pencil className="size-4 shrink-0" aria-hidden /> Đã biết rồi — nhập số tiền
        </>
      ) : (
        <>
          <CircleHelp className="size-4 shrink-0" aria-hidden /> Chưa biết bao nhiêu? Ghi trước, điền sau
        </>
      )}
    </button>
  );

  if (amountUnknown) {
    return (
      // Cùng hộp, cùng chỗ — chỉ đổi ruột, để người dùng không mất dấu chỗ vừa bấm.
      <div className="space-y-2 overflow-hidden rounded-2xl border border-border bg-sunken p-4">
        <div className={cn("flex items-center justify-center gap-2 text-title font-bold", tone)}>
          <CircleHelp className="size-6 shrink-0" aria-hidden />
          {UNKNOWN_AMOUNT_LONG}
        </div>
        <p className="text-center text-caption text-muted-foreground">
          Khoản này vào sổ ngay để bạn không quên, nhưng chưa cộng vào tổng thu chi.
          Trang Ghi chép sẽ nhắc tới khi bạn điền số tiền.
        </p>
        {toggle}
      </div>
    );
  }

  return (
    // Viền lỗi ở khung ngoài (ô thật bên trong không viền); id/aria-* ở <input>.
    <div
      className={cn(
        "money-cq space-y-3 overflow-hidden rounded-2xl border bg-sunken px-3 pb-2 pt-4 transition-colors duration-150 focus-within:border-primary",
        invalid ? "border-destructive focus-within:border-destructive" : "border-border"
      )}
    >
      <div className="flex items-baseline justify-center gap-1.5 px-1">
        <span className={cn("text-title font-bold", tone)} aria-hidden>
          {type === "INCOME" ? "+" : type === "EXPENSE" ? "−" : null}
        </span>
        <input
          id={id}
          inputMode="numeric"
          enterKeyHint="done"
          autoComplete="off"
          aria-label="Số tiền"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder="0"
          value={value ? formatMoneyInput(String(value)) : ""}
          onChange={(e) => onValueChange(parseMoney(e.target.value))}
          onBlur={onBlur}
          className={cn(
            // field-sizing-content: ô co theo số đã nhập nên dấu −/₫ dính sát.
            "num-hero min-w-8 max-w-full border-0 bg-transparent p-0 text-center text-money-hero font-bold leading-tight outline-none field-sizing-content placeholder:text-muted-foreground",
            tone
          )}
        />
        <span className={cn("text-title font-bold", tone)} aria-hidden>
          ₫
        </span>
      </div>

      {suggestions ? (
        <div role="group" aria-label="Có phải bạn định gõ" className="space-y-1.5">
          <p className="text-center text-caption text-muted-foreground">Có phải bạn định gõ:</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {suggestions.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onValueChange(a)}
                className={cn(
                  "focus-ring num min-h-11 rounded-lg border border-input bg-card px-3.5 text-label font-semibold transition-colors duration-150 hover:border-primary",
                  tone
                )}
              >
                {formatMoney(a)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div role="group" aria-label="Bấm để cộng thêm" className="scroll-fade -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {QUICK.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onValueChange(value + a)}
              aria-label={`Cộng thêm ${formatMoney(a)}`}
              className="focus-ring num min-h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-label text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-primary"
            >
              +{formatMoneyShort(a)}
            </button>
          ))}
          {value > 0 && (
            <button
              type="button"
              onClick={() => onValueChange(0)}
              className="focus-ring min-h-11 shrink-0 rounded-lg px-3.5 text-label text-muted-foreground transition-colors duration-150 hover:text-expense"
            >
              Nhập lại
            </button>
          )}
        </div>
      )}

      {toggle}
    </div>
  );
}
