"use client";
import * as React from "react";
import { CircleHelp, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UNKNOWN_AMOUNT_LONG } from "@/lib/copy";
import { cn, formatMoneyInput, parseMoney } from "@/lib/utils";

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

/**
 * Ô số tiền chính của các form: con số cỡ hero, tô theo chiều thu/chi, kèm lối
 * "chưa biết số tiền".
 *
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

  // Nút thật (viền, nền thẻ, nhãn ngắn một dòng) — dạng chữ xám trước đây đọc
  // như một dòng chú thích, người dùng không nhận ra là bấm được.
  const toggle = onAmountUnknownChange && (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => onAmountUnknownChange(!amountUnknown)}
      aria-pressed={amountUnknown}
      className="mx-auto flex text-label"
    >
      {amountUnknown ? (
        <>
          <Pencil aria-hidden /> Nhập số tiền
        </>
      ) : (
        <>
          <CircleHelp aria-hidden /> Chưa biết số tiền
        </>
      )}
    </Button>
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
        "money-cq space-y-3 overflow-hidden rounded-2xl border bg-sunken px-3 pt-4 transition-colors duration-150 focus-within:border-primary",
        // Chân là nút cao 44px thì đệm đáy mỏng; chỉ còn con số thì cân với đỉnh.
        toggle ? "pb-2" : "pb-4",
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

      {toggle}
    </div>
  );
}
