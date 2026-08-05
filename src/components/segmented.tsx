"use client";
import { cn } from "@/lib/utils";

type Tone = "primary" | "income" | "expense";

const ACTIVE: Record<Tone, string> = {
  primary: "bg-card text-primary shadow-soft",
  income: "bg-income text-white shadow-soft",
  expense: "bg-expense text-white shadow-soft",
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
      className={cn("grid gap-1 rounded-md bg-sunken p-1", className)}
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
              "rounded-sm py-2 text-sm font-semibold transition-all",
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
