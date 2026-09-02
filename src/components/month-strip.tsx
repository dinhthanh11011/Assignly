"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useNavTransition } from "@/components/nav-progress";
import { formatMonth, shiftMonth } from "@/lib/utils";

/**
 * Dải tháng ở đầu trang Ghi chép: chỉ để chuyển tháng.
 *
 * Đây là thứ THAY THẾ panel số dư tối (BalanceHero) trên trang này. Bản cũ
 * render đúng cùng một panel tối ở cả trang Tổng quan lẫn trang Giao dịch, chỉ
 * khác chữ nhãn — đó chính là lý do người dùng báo hai trang "khá giống nhau
 * nên nhầm lẫn nhiều". Dải sáng thấp này có dáng hoàn toàn khác, và giờ chỉ
 * còn `/reports` được dùng panel tối.
 *
 * Cố ý KHÔNG có tổng vào / ra / chênh lệch của tháng: trang Báo cáo đã nói đúng
 * những con số đó rồi, để cả hai nơi cùng nói là lại tạo ra hai trang na ná
 * nhau — đúng thứ dải này sinh ra để tránh.
 */
export function MonthStrip({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useNavTransition();
  // Hiện ngay tháng vừa bấm rồi mới chờ server — bấm liên tiếp vẫn nhảy tháng
  // mượt thay vì đứng im ở tháng cũ.
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const shown = pending && optimistic ? optimistic : month;

  const go = (delta: number) => {
    const next = shiftMonth(shown, delta);
    setOptimistic(next);
    const sp = new URLSearchParams(params.toString());
    sp.set("month", next);
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <StepButton label="Tháng trước" onClick={() => go(-1)}>
          <ChevronLeft className="size-6" />
        </StepButton>
        <span className="flex min-w-0 items-center justify-center gap-2 text-title">
          {formatMonth(shown)}
          {pending && <Loader2 className="size-5 shrink-0 animate-spin text-primary" />}
        </span>
        <StepButton label="Tháng sau" onClick={() => go(1)}>
          <ChevronRight className="size-6" />
        </StepButton>
      </div>
    </section>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="focus-ring flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
    >
      {children}
    </button>
  );
}
