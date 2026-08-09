"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Đổi sáng/tối. Icon được chọn bằng CSS (next-themes gắn class `dark` lên
 * <html>) thay vì state — nhờ vậy không cần chờ mount và không bị nháy sai icon.
 *
 * Luôn kèm CHỮ, không phải nút chỉ có hình mặt trăng: một icon trần không nói
 * cho ai biết nó sẽ làm gì khi bấm.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "focus-ring flex min-h-12 w-full items-center gap-3 rounded-md px-4 text-body font-semibold text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground",
        className
      )}
    >
      <Moon className="size-6 shrink-0 dark:hidden" />
      <Sun className="hidden size-6 shrink-0 dark:block" />
      <span className="dark:hidden">Chuyển nền tối</span>
      <span className="hidden dark:inline">Chuyển nền sáng</span>
    </button>
  );
}
