import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn, formatMoney, formatMoneyShort } from "@/lib/utils";

export type AmountTone = "income" | "expense" | "neutral" | "auto";

const SIZES = {
  row: "text-money-row",
  lg: "text-money-lg",
  hero: "text-money-hero num-hero",
  body: "text-body font-semibold",
} as const;

/**
 * Một con số tiền — cách DUY NHẤT app vẽ tiền có chiều.
 *
 * Không bao giờ chỉ dựa vào màu: luôn có dấu +/− (và mũi tên nếu `icon`), nên
 * người mù màu và bản in đen trắng vẫn đọc đúng chiều tiền.
 * `tone="auto"` lấy chiều từ dấu của `value` (dương = vào, âm = ra).
 */
export function Amount({
  value,
  tone = "auto",
  size = "row",
  signed = true,
  icon = false,
  short = false,
  className,
}: {
  value: number;
  tone?: AmountTone;
  size?: keyof typeof SIZES;
  /** Hiện dấu +/−. Tắt khi ngữ cảnh đã nói rõ chiều (ví dụ nhãn "Đã chi"). */
  signed?: boolean;
  /** Thêm mũi tên chỉ chiều trước con số. */
  icon?: boolean;
  /** Dạng gọn "1,25 tr" cho chỗ hẹp. */
  short?: boolean;
  className?: string;
}) {
  const t = tone === "auto" ? (value > 0 ? "income" : value < 0 ? "expense" : "neutral") : tone;
  const abs = Math.abs(value);
  const sign = !signed || t === "neutral" || abs === 0 ? "" : t === "income" ? "+" : "−";
  const text = short ? formatMoneyShort(abs) : formatMoney(abs);
  const Icon = t === "income" ? ArrowDownLeft : t === "expense" ? ArrowUpRight : null;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 whitespace-nowrap",
        SIZES[size],
        t === "income" && "text-income",
        t === "expense" && "text-expense",
        t === "neutral" && "text-foreground",
        className
      )}
    >
      {icon && Icon && <Icon className="size-[0.9em] shrink-0" aria-hidden />}
      {sign}
      {text}
    </span>
  );
}
