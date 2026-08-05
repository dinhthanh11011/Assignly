"use client";
import { cn } from "@/lib/utils";

type Tone = "primary" | "income" | "expense";

/**
 * Nền tối dùng mint/coral sáng nên chữ phải là màu ink; nền sáng thì hai màu này
 * đậm hơn nên chữ trắng mới đủ tương phản.
 */
const ACTIVE: Record<Tone, string> = {
  primary: "bg-primary text-primary-foreground shadow-soft",
  income: "bg-income text-white shadow-soft dark:text-background",
  expense: "bg-expense text-white shadow-soft dark:text-background",
};

/** Nút chuyển đổi dạng "segmented control" của iOS: gọn, rõ trạng thái đang chọn. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; tone?: Tone }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("grid gap-1 rounded-full bg-sunken p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full py-2.5 text-sm font-semibold transition-all duration-200 ease-spring",
              on ? ACTIVE[o.tone ?? "primary"] : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
