"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chọn nền sáng / tối / theo máy — ba ô rõ ràng thay cho một nút bật tắt.
 *
 * Mặc định của app là NỀN SÁNG. Chữ đen trên nền sáng đọc tốt hơn có đo được,
 * và khoảng cách đó tăng theo tuổi. Ngoài ra chữ sáng trên nền tối bị loé trong
 * mắt có độ đục thuỷ tinh thể, mà loé nặng nhất ở nét mảnh tương phản cao —
 * dấu thanh tiếng Việt đúng là nét mảnh tương phản cao.
 *
 * "Theo máy" vẫn giữ cho ai muốn, nhưng không phải mặc định: rất nhiều điện
 * thoại xuất xưởng đã bật sẵn nền tối mà chủ máy chưa hề chọn.
 */

const OPTIONS = [
  { value: "light", label: "Nền sáng", icon: Sun },
  { value: "dark", label: "Nền tối", icon: Moon },
  { value: "system", label: "Theo máy", icon: Monitor },
] as const;

const subscribeNever = () => () => {};

export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  // Lần render trên server và lần render đầu ở client phải giống nhau, nếu
  // không React sẽ báo lệch hydration. useSyncExternalStore cho ta "đã mount
  // chưa" mà không cần setState trong effect.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  return (
    <div role="radiogroup" aria-label="Nền sáng hay tối" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {OPTIONS.map((o) => {
        const active = mounted && theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(o.value)}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-lg border-[1.5px] px-4 py-3 text-body transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              active ? "border-primary bg-primary-surface text-primary" : "border-border bg-card hover:bg-sunken"
            )}
          >
            <o.icon className="size-5 shrink-0" />
            <span className="flex-1 text-left">{o.label}</span>
            {active && <Check className="size-5 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
