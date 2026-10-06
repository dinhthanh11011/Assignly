"use client";
import { useEffect, useId, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "ledger.calendar-open";

/**
 * Lịch tháng gấp/mở được; nhớ lựa chọn trong máy (localStorage).
 *
 * Mặc định MỞ — lần đầu vào phải thấy lịch có tồn tại. localStorage có thể ném
 * lỗi (chế độ riêng tư, chặn dữ liệu trang) nên mọi lần đọc/ghi đều try/catch;
 * hỏng thì chỉ là không nhớ, trang vẫn chạy.
 *
 * Gấp lại bằng `hidden` chứ không gỡ khỏi cây: lịch còn giữ sheet ngày đang mở.
 */
export function CollapsibleCalendar({
  summary,
  children,
}: {
  /** Một dòng ngắn khi gấp — VD "18 ngày có ghi". */
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const panelId = useId();

  useEffect(() => {
    try {
      // Đọc sau khi hydrate để server và client vẽ cùng một thứ ở lượt đầu.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(KEY) === "0") setOpen(false);
    } catch {}
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="focus-ring flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left text-label text-foreground transition-colors duration-150 hover:bg-sunken"
      >
        <CalendarDays className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          {open ? "Lịch tháng" : "Xem lịch tháng"}
          {!open && summary && (
            <span className="ml-2 font-normal text-muted-foreground">{summary}</span>
          )}
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
