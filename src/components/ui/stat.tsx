import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ô KPI: nhãn · con số · (tuỳ chọn) so với kỳ trước.
 *
 * Delta luôn có mũi tên VÀ chữ ("tăng 12%"), không chỉ màu. `goodWhen` nói
 * chiều nào là tốt: chi tăng là xấu, thu tăng là tốt.
 */
export function Stat({
  label,
  value,
  icon: Icon,
  delta,
  goodWhen = "up",
  hint,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ElementType;
  /** Tỉ lệ thay đổi, ví dụ 0.12 = +12%. null/undefined = không có kỳ trước. */
  delta?: number | null;
  goodWhen?: "up" | "down";
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-2 text-label text-muted-foreground">
        {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div className="min-w-0 truncate">{value}</div>
      {delta != null && Number.isFinite(delta) && <Delta value={delta} goodWhen={goodWhen} />}
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Delta({ value, goodWhen = "up" }: { value: number; goodWhen?: "up" | "down" }) {
  const pct = Math.round(Math.abs(value) * 100);
  const dir = pct === 0 ? "flat" : value > 0 ? "up" : "down";
  const good = dir === "flat" ? null : dir === goodWhen;
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-caption",
        good === true && "text-income",
        good === false && "text-expense",
        good === null && "text-muted-foreground"
      )}
    >
      <Icon className="size-4" aria-hidden />
      {dir === "flat" ? "Không đổi" : `${dir === "up" ? "Tăng" : "Giảm"} ${pct}%`}
      <span className="text-muted-foreground">so với kỳ trước</span>
    </span>
  );
}
