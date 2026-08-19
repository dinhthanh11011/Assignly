"use client";
import * as React from "react";
import { CircleHelp, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UNKNOWN_AMOUNT_LONG } from "@/lib/copy";
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
  id = "amount",
  value,
  onValueChange,
  type = "EXPENSE",
  autoFocus,
  invalid,
  describedBy,
  amountUnknown = false,
  onAmountUnknownChange,
}: {
  /** Phải trùng khoá luật của useValidation — check() tìm ô bằng getElementById. */
  id?: string;
  value: number;
  onValueChange: (value: number) => void;
  type?: "INCOME" | "EXPENSE";
  autoFocus?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Đang ghi một khoản CHƯA BIẾT số tiền — ô nhập nhường chỗ cho lời hẹn. */
  amountUnknown?: boolean;
  /** Bỏ trống = không cho chuyển sang "chưa biết" ở form này (VD: màn điền tiền). */
  onAmountUnknownChange?: (amountUnknown: boolean) => void;
}) {
  const tone = type === "INCOME" ? "text-income" : "text-expense";

  // "Chưa biết số tiền" phải là một LỰA CHỌN NHÌN THẤY ĐƯỢC ngay tại ô tiền, không
  // phải một ô tích nằm cuối form: người dùng mở form ra là đã đang bí ở đúng câu
  // hỏi này ("bữa đó bạn Nam trả, chưa biết bao nhiêu"), và nếu ở đây không có
  // đường nào khác thì họ chỉ còn hai lối — gõ một con số bừa (sổ sai vĩnh viễn)
  // hoặc bỏ luôn không ghi (quên mất khoản nợ).
  const toggle = onAmountUnknownChange && (
    <button
      type="button"
      onClick={() => onAmountUnknownChange(!amountUnknown)}
      aria-pressed={amountUnknown}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 text-label text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {amountUnknown ? (
        <>
          <Pencil className="size-4 shrink-0" /> Đã biết rồi — nhập số tiền
        </>
      ) : (
        <>
          <CircleHelp className="size-4 shrink-0" /> Chưa biết bao nhiêu — điền sau
        </>
      )}
    </button>
  );

  if (amountUnknown) {
    return (
      // Vẫn là cùng một cái hộp, cùng chỗ, cùng cỡ — chỉ đổi ruột. Đổi hẳn bố cục
      // ở đây thì người dùng mất dấu chỗ mình vừa bấm.
      <div className="space-y-3 overflow-hidden rounded-xl border border-border bg-sunken p-4">
        {/* KHÔNG có <input> nào trong nhánh này, nên cũng không có gì để aria-invalid
            hay describedBy trỏ tới — và cũng không cần: chưa biết tiền thì không có
            luật nào để mà sai. */}
        <div className={cn("flex items-center justify-center gap-2 text-title font-bold", tone)}>
          <CircleHelp className="size-6 shrink-0" />
          {UNKNOWN_AMOUNT_LONG}
        </div>
        <p className="text-center text-caption text-muted-foreground">
          Khoản này vẫn vào sổ ngay để bạn không quên, nhưng chưa được cộng vào tổng
          thu chi. Trang chủ sẽ nhắc tới khi bạn điền số tiền.
        </p>
        {toggle}
      </div>
    );
  }

  return (
    // Viền báo lỗi đặt ở KHUNG NGOÀI, không phải ở <input>: ô nhập thật bên
    // trong có border-0 (nó chỉ là con số trần), nên hộp mà người dùng nhìn
    // thấy chính là div này. Còn id/aria-* thì ngược lại, phải nằm trên
    // <input> vì đó mới là thứ focus được và máy đọc màn hình đọc.
    <div
      className={cn(
        "space-y-3 overflow-hidden rounded-xl border bg-sunken p-4",
        invalid ? "border-destructive" : "border-border"
      )}
    >
      <div className="flex items-baseline justify-center gap-1.5">
        <span className={cn("text-title font-bold", tone)}>{type === "INCOME" ? "+" : "−"}</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-label="Số tiền"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
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

      {toggle}
    </div>
  );
}
