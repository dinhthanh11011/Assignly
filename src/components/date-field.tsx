"use client";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Ô chọn ngày kèm nút xoá.
 *
 * Safari trên iOS không có cách nào xoá ô `<input type="date">` đã có giá trị:
 * bàn phím ngày chỉ cho lăn chọn, không có mục "trống" và cũng không nhận nút
 * Backspace. Nút "×" bên phải là đường duy nhất để trả ô về rỗng — cần cho các
 * ngày không bắt buộc (hạn trả) và cũng tiện cho ngày bắt buộc khi muốn chọn lại.
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  required,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: React.ReactNode;
  className?: string;
  /** Nút bấm nhanh hiện dưới ô (VD: các mốc hạn trả gợi ý). */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          // pr-11: chừa chỗ cho nút xoá, không để nó đè lên ngày đang hiện.
          className={cn(value && "pr-11")}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Xoá ${label.toLowerCase()}`}
            className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {children}
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
    </div>
  );
}
