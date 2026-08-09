"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { setActiveGroup } from "@/lib/actions";
import { useNavTransition } from "@/components/nav-progress";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { formatMonth, shiftMonth } from "@/lib/utils";

/**
 * Đặt/xoá tham số trên URL hiện tại rồi điều hướng tới đó.
 *
 * Chạy trong transition để biết lúc nào server còn đang dựng trang mới: đổi bộ
 * lọc là một lượt đi/về DB, không có dấu hiệu gì thì người dùng tưởng nút hỏng
 * và bấm lại lần nữa.
 */
function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useNavTransition();

  const setParam = (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) sp.delete(key);
      else sp.set(key, value);
    }
    const qs = sp.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return [setParam, pending] as const;
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
  const [, startTransition] = useNavTransition();
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
  const [setParam, pending] = useSetParam();
  // Hiện ngay tháng vừa bấm rồi mới chờ server — bấm liên tiếp vẫn nhảy tháng
  // mượt thay vì đứng im ở tháng cũ.
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const shown = pending && optimistic ? optimistic : month;

  const go = (delta: number) => {
    const next = shiftMonth(shown, delta);
    setOptimistic(next);
    setParam({ month: next });
  };

  return (
    <div className="surface-float flex h-12 items-center gap-0.5 rounded-xl p-1">
      <button
        type="button"
        aria-label="Tháng trước"
        onClick={() => go(-1)}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="flex min-w-[6.5rem] items-center justify-center gap-1.5 text-center text-caption font-bold">
        {formatMonth(shown)}
        {pending && <Loader2 className="size-3 shrink-0 animate-spin text-primary" />}
      </span>
      <button
        type="button"
        aria-label="Tháng sau"
        onClick={() => go(1)}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

/** Bộ lọc dạng chip trên URL (loại khoản, trạng thái khoản mượn, khoảng thời gian…). */
export function FilterChips({
  param,
  value,
  options,
  label = "Lọc danh sách",
  className,
}: {
  param: string;
  value: string;
  options: { value: string; label: string }[];
  /** Tên của cả nhóm chip — máy đọc màn hình cần biết hàng chip này lọc cái gì. */
  label?: string;
  className?: string;
}) {
  const [setParam, pending] = useSetParam();
  // Chip vừa bấm sáng lên ngay, chưa cần chờ server xác nhận.
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const active = pending && optimistic !== null ? optimistic : value;

  const pick = (next: string) => {
    setOptimistic(next);
    setParam({ [param]: next || null });
  };

  return (
    <ChoiceGroup
      label={label}
      variant="chip"
      value={active}
      onChange={pick}
      options={options}
      pending={pending}
      pendingLabel="Đang lọc danh sách"
      className={className}
    />
  );
}
