"use client";
import Link from "next/link";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NƠI DUY NHẤT dựng "chọn một trong N" trong app.
 *
 * Trước đây có NĂM bản chép tay của cùng một control — segmented.tsx,
 * filter-bar, theme-choice, font-size-control, và hàng trong sheet lọc — cộng
 * một bản thứ sáu bằng <Link> ở debt-tabs. Hai trong số đó trông giống hệt nhau
 * mà khai role khác nhau (`tablist` với `radiogroup`), ba bản tô ô đang chọn
 * bằng ba kiểu khác nhau.
 *
 * Nhưng vấn đề nặng hơn hẳn chuyện lặp code: cả năm bản đều KHAI role ARIA mà
 * KHÔNG cài hành vi bàn phím đi kèm. Theo chuẩn, một radiogroup là MỘT điểm
 * dừng Tab và người dùng chọn bằng phím mũi tên; ở đây mỗi lựa chọn lại là một
 * điểm dừng Tab riêng và mũi tên không làm gì cả (`grep tabIndex src` trước đợt
 * này trả về rỗng). Nghĩa là app nói với máy đọc màn hình một cách dùng, rồi cư
 * xử theo một cách khác — tệ hơn là không khai gì.
 *
 * Dựng trên Radix RadioGroup chứ không tự viết vòng focus: roving tabIndex,
 * mũi tên, Home/End, bỏ qua mục disabled, và hướng RTL đều là chỗ bug thật sự
 * nằm — nhất là với variant "chip" có thanh cuộn ngang.
 *
 * KHÔNG dùng Radix Tabs cho bất cứ cái nào ở đây: không cái nào là tab widget.
 * Năm cái là bộ chọn giá trị không hề có tabpanel; debt-tabs là điều hướng bằng
 * link (xem ChoiceGroupLinks ở cuối file).
 */

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ElementType;
  /** Emoji đứng trước nhãn (variant "list"). */
  emoji?: string;
  /** Chữ phụ dưới nhãn. */
  hint?: string;
  /** Chip đếm bên phải. */
  badge?: React.ReactNode;
  disabled?: boolean;
  /** Màu của ô đang chọn ở variant "segment". Mặc định không tô màu. */
  tone?: "primary" | "income" | "expense";
};

const TONE_ACTIVE = {
  primary: "bg-primary text-primary-foreground",
  income: "bg-income text-income-foreground",
  expense: "bg-expense text-expense-foreground",
} as const;

export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  variant = "segment",
  pending,
  pendingLabel = "Đang tải",
  renderOption,
  className,
}: {
  /** BẮT BUỘC — thành aria-label của cả nhóm. Không có mặc định vì một nhóm
   *  lựa chọn không tên thì máy đọc màn hình chỉ đọc được các nhãn con. */
  label: string;
  /** "" nghĩa là chưa chọn gì (theme/cỡ chữ render null trước khi hydrate). */
  value: T | "";
  onChange: (value: T) => void;
  options: ChoiceOption<T>[];
  /**
   * segment — mấy ô liền nhau trong một khay (bộ lọc, chọn chiều thu/chi)
   * card    — lưới ô có viền, chọn thì hiện dấu tích (nền sáng tối, cỡ chữ)
   * chip    — hàng cuộn ngang
   * list    — hàng dọc trong sheet
   */
  variant?: "segment" | "card" | "chip" | "list";
  /** Đang chờ server: ô đang chọn hiện vòng xoay + một câu đọc được. */
  pending?: boolean;
  pendingLabel?: string;
  /** Tự vẽ ruột một ô — cỡ chữ cần câu mẫu ở đúng cỡ của nó. */
  renderOption?: (option: ChoiceOption<T>, state: { active: boolean }) => React.ReactNode;
  className?: string;
}) {
  const root =
    variant === "segment"
      ? "grid grid-cols-1 gap-1.5 rounded-xl border border-border bg-sunken p-1"
      : variant === "card"
        ? "grid grid-cols-1 gap-2 sm:grid-cols-3"
        : variant === "chip"
          ? "scroll-fade flex gap-1.5 overflow-x-auto"
          : "divide-y divide-border overflow-hidden rounded-xl border border-border";

  return (
    <RadioGroupPrimitive.Root
      aria-label={label}
      value={value}
      onValueChange={(v) => onChange(v as T)}
      // Ngang → mũi tên trái/phải là hướng tự nhiên. "list" xếp dọc.
      orientation={variant === "list" ? "vertical" : "horizontal"}
      loop
      className={cn(root, className)}
      // grid-cols đặt bằng inline style: số cột bằng số lựa chọn, không biết
      // trước lúc build nên không có class Tailwind nào tả được.
      style={
        variant === "segment"
          ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {options.map((o) => {
        const active = o.value === value;
        const spin = Boolean(pending) && active;
        return (
          <RadioGroupPrimitive.Item
            key={o.value}
            value={o.value}
            disabled={o.disabled}
            aria-busy={spin || undefined}
            className={cn(
              "focus-ring text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              variant === "segment" &&
                cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-body",
                  active
                    ? o.tone
                      ? cn(TONE_ACTIVE[o.tone], "font-semibold")
                      : "bg-card font-bold text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                ),
              variant === "card" &&
                cn(
                  "flex min-h-14 flex-col justify-center gap-1 rounded-lg border px-4 py-3 text-body",
                  active ? "border-primary bg-primary-surface" : "border-input bg-card hover:bg-sunken"
                ),
              variant === "chip" &&
                cn(
                  "flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-caption font-semibold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-sunken text-muted-foreground hover:text-foreground"
                ),
              // focus-ring-inset ở "list": hàng nằm trong ngăn overflow-hidden,
              // vòng vẽ ra ngoài mép sẽ bị cha cắt mất.
              variant === "list" &&
                cn(
                  "focus-ring-inset flex min-h-14 w-full items-center gap-3 px-4 py-2",
                  active ? "bg-primary-surface text-primary" : "hover:bg-sunken"
                )
            )}
          >
            {renderOption ? (
              renderOption(o, { active })
            ) : (
              <>
                {o.emoji && <span className="text-title leading-none">{o.emoji}</span>}
                {o.icon && <o.icon className="size-5 shrink-0" aria-hidden />}
                <span className={cn("min-w-0", variant === "list" && "flex-1 truncate text-body-lg")}>
                  <span className={cn(variant === "card" && "flex items-center gap-2")}>
                    {o.label}
                    {variant === "card" && active && (
                      <Check className="size-4 shrink-0 text-primary" aria-hidden />
                    )}
                  </span>
                  {o.hint && (
                    <span className="block text-caption text-muted-foreground">{o.hint}</span>
                  )}
                </span>
                {o.badge}
                {variant === "list" && active && <Check className="size-5 shrink-0" aria-hidden />}
              </>
            )}
            {/* Vòng xoay trần là tín hiệu THUẦN THỊ GIÁC — bản cũ ở filter-bar
                không kèm chữ nào, nên với máy đọc màn hình việc "danh sách đang
                tải lại" đơn giản là không xảy ra. */}
            {spin && (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                <span role="status" className="sr-only">
                  {pendingLabel}
                </span>
              </>
            )}
          </RadioGroupPrimitive.Item>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}

/**
 * Cùng dáng "segment" nhưng các mục là ĐƯỜNG DẪN, không phải giá trị.
 *
 * Cố ý KHÔNG phải radiogroup và KHÔNG có roving tabIndex: link là điều hướng,
 * và mỗi link phải là một điểm dừng Tab riêng — đó mới là hành vi đúng. Nó ở
 * chung file với ChoiceGroup chỉ để hai thứ trông giống nhau thì dùng chung một
 * bộ class, thay vì bản chép thứ ba của cùng kiểu tô.
 */
export function ChoiceGroupLinks({
  label,
  items,
  activeKey,
  className,
}: {
  label: string;
  items: { key: string; href: string; label: string; badge?: React.ReactNode }[];
  activeKey: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn("flex gap-1.5 rounded-xl border border-border bg-sunken p-1", className)}
    >
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === activeKey ? "page" : undefined}
          className={cn(
            "focus-ring flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-3 text-body transition-colors",
            t.key === activeKey
              ? "bg-card font-bold text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
          {t.badge}
        </Link>
      ))}
    </nav>
  );
}
