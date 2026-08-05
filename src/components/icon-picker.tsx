"use client";
import { cn } from "@/lib/utils";

/** Emoji gợi ý khi tạo / sửa danh mục. */
export const SUGGESTED_ICONS = [
  "🍜", "🛵", "🏠", "🧾", "🛍️", "💊", "🎬", "📚", "✈️", "🎓",
  "💰", "🎁", "🏪", "📈", "💼", "🐶", "👶", "☕", "⚡", "📦",
];

export function IconPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {SUGGESTED_ICONS.map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={cn(
            "size-8 rounded-sm text-base leading-none transition-colors",
            value === i ? "bg-primary/12 ring-1 ring-primary" : "bg-card hover:bg-muted"
          )}
        >
          {i}
        </button>
      ))}
    </div>
  );
}
