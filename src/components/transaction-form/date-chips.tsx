"use client";
import { useRef, useState } from "react";
import { CalendarDays, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { describedBy } from "@/components/field";
import { cn, dayFieldSummary, formatDate, formatWeekday, shiftDateKey } from "@/lib/utils";

const chip =
  "focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3.5 text-label transition-colors duration-150";
const chipOn = "border-primary bg-primary-surface font-semibold text-primary";
const chipOff = "border-input bg-card text-muted-foreground hover:bg-sunken hover:text-foreground";

/**
 * Ngày của khoản: hai chip "Hôm nay / Hôm qua" (gần như mọi khoản rơi vào đây)
 * + "Ngày khác" mở ô chọn ngày của hệ điều hành.
 *
 * Ngày nằm ngoài hai chip (mở từ ô lịch, sửa khoản cũ) thì ô ngày hiện sẵn kèm
 * câu đọc lại "Thứ Hai, 24/08 · 3 ngày trước" và cảnh báo khi trông như chọn nhầm.
 */
export function DateChips({
  id,
  value,
  onChange,
  invalid,
  error,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  /** <FieldError id={`${id}-error`}/> */
  error?: React.ReactNode;
}) {
  const today = shiftDateKey("", 0);
  const yesterday = shiftDateKey("", -1);
  const preset = value === today || value === yesterday;
  const [custom, setCustom] = useState(!preset);
  const inputRef = useRef<HTMLInputElement>(null);
  const showInput = custom || !preset;
  const summary = value && showInput ? dayFieldSummary(value) : null;

  function openPicker() {
    setCustom(true);
    // Đợi ô ngày được vẽ ra rồi mới mở bàn chọn của hệ điều hành.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      try {
        el.showPicker?.();
      } catch {
        // Safari cũ / không có cử chỉ người dùng: ô đã focus là đủ.
      }
    });
  }

  return (
    <div role="group" aria-labelledby={`${id}-label`} className="space-y-2">
      <span id={`${id}-label`} className="block text-label text-foreground">
        Ngày
      </span>
      <div className="flex flex-wrap gap-2">
        {[
          { key: today, label: "Hôm nay" },
          { key: yesterday, label: "Hôm qua" },
        ].map((p) => {
          const on = value === p.key && !custom;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setCustom(false);
                onChange(p.key);
              }}
              className={cn(chip, on ? chipOn : chipOff)}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={showInput}
          onClick={openPicker}
          className={cn(chip, showInput ? chipOn : chipOff)}
        >
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          {showInput && value ? formatDate(value) : "Ngày khác"}
        </button>
      </div>

      {showInput && (
        <>
          {/* px-3: ruột ô ngày do trình duyệt vẽ, gần như không co được. */}
          <Input
            ref={inputRef}
            id={id}
            type="date"
            aria-label="Chọn ngày"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy(summary && `${id}-relative`, error && `${id}-error`)}
            className="px-3 sm:max-w-xs"
          />
          {summary && (
            <p
              id={`${id}-relative`}
              className={cn(
                "flex items-start gap-1.5 text-caption",
                summary.caution ? "text-warning" : "text-muted-foreground"
              )}
            >
              {summary.caution && <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
              <span>
                {formatWeekday(value)}, {formatDate(value)} · {summary.text}
              </span>
            </p>
          )}
        </>
      )}
      {error}
    </div>
  );
}
