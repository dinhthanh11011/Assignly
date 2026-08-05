"use client";
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveGroup } from "@/lib/actions";
import { cn, formatMonth, shiftMonth } from "@/lib/utils";

/** Đặt/xoá tham số trên URL hiện tại rồi điều hướng tới đó. */
function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) sp.delete(key);
      else sp.set(key, value);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
}

/**
 * Chọn sổ đang xem. Sổ được ghim ở server (cookie) chứ không nằm trên URL, nên
 * lựa chọn này theo người dùng sang mọi trang khác cho tới khi họ đổi sổ.
 *
 * Cũng xoá luôn `?group=` khỏi URL hiện tại (nếu có, ví dụ vừa vào từ trang chi
 * tiết sổ): để lại thì tham số cũ sẽ đè lên sổ vừa ghim. Các bộ lọc khác trên
 * URL (tháng, loại, danh mục…) được giữ nguyên.
 */
export function GroupPicker({
  groups,
  current,
}: {
  groups: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [picked, setPicked] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (groups.length < 2) return null;

  const pick = (groupId: string) => {
    setPicked(groupId); // hiện tên sổ mới ngay, không chờ server
    startTransition(async () => {
      try {
        await setActiveGroup(groupId);
        const sp = new URLSearchParams(params.toString());
        sp.delete("group");
        const qs = sp.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
        router.refresh();
      } catch (e) {
        setPicked(null);
        toast.error(e instanceof Error ? e.message : "Không đổi được sổ");
      }
    });
  };

  return (
    <Select value={picked ?? current} onValueChange={pick}>
      <SelectTrigger className="h-10 w-auto min-w-40 rounded-full text-[13px]">
        <Wallet className="size-4 shrink-0 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Link "mở sổ này ở trang X" (dùng ở trang chi tiết sổ): ghim sổ rồi mới đi, để
 * các trang sau đó cũng ở đúng sổ. `href` vẫn mang `?group=` nên mở tab mới /
 * bookmark vẫn ra đúng sổ dù chưa kịp ghim.
 */
export function OpenInGroupLink({
  groupId,
  href,
  onClick,
  ...rest
}: { groupId: string; href: string } & Omit<React.ComponentProps<"a">, "href">) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const target = `${href}${href.includes("?") ? "&" : "?"}group=${groupId}`;

  return (
    <a
      {...rest}
      href={target}
      onClick={(e) => {
        onClick?.(e);
        // Để chuột giữa / ctrl+click mở tab mới như một link bình thường.
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        startTransition(async () => {
          await setActiveGroup(groupId).catch(() => {});
          router.push(href);
        });
      }}
    />
  );
}

/** Chuyển tháng trước / tháng sau. */
export function MonthPicker({ month }: { month: string }) {
  const setParam = useSetParam();

  return (
    <div className="glass flex h-10 items-center gap-0.5 rounded-full p-1 shadow-soft">
      <button
        type="button"
        aria-label="Tháng trước"
        onClick={() => setParam({ month: shiftMonth(month, -1) })}
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-[6.5rem] text-center text-[13px] font-bold">
        {formatMonth(month)}
      </span>
      <button
        type="button"
        aria-label="Tháng sau"
        onClick={() => setParam({ month: shiftMonth(month, 1) })}
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

/** Bộ lọc dạng chip trên URL (loại giao dịch, trạng thái khoản vay, khoảng thời gian…). */
export function FilterChips({
  param,
  value,
  options,
  className,
}: {
  param: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const setParam = useSetParam();

  return (
    <div className={cn("no-scrollbar flex gap-1.5 overflow-x-auto", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setParam({ [param]: o.value || null })}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all duration-150 ease-spring",
            o.value === value
              ? "bg-primary text-primary-foreground shadow-soft"
              : "bg-sunken text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
