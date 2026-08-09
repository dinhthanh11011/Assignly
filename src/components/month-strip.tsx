"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useNavTransition } from "@/components/nav-progress";
import { monthSentence } from "@/lib/copy";
import { cn, formatMoney, formatMonth, shiftMonth } from "@/lib/utils";

/**
 * Dải tháng ở đầu trang Ghi chép: chuyển tháng + ba con số của tháng đó.
 *
 * Đây là thứ THAY THẾ panel số dư tối (BalanceHero) trên trang này. Bản cũ
 * render đúng cùng một panel tối ở cả trang Tổng quan lẫn trang Giao dịch, chỉ
 * khác chữ nhãn — đó chính là lý do người dùng báo hai trang "khá giống nhau
 * nên nhầm lẫn nhiều". Dải sáng thấp này có dáng hoàn toàn khác, và giờ chỉ
 * còn `/reports` được dùng panel tối.
 *
 * Kết quả tháng nói thành CÂU ("Tháng này còn dư 4.000.000 ₫") chứ không phải
 * nhãn "Chênh lệch" cộng một con số.
 */
export function MonthStrip({
  month,
  income,
  expense,
}: {
  month: string;
  income: number;
  expense: number;
}) {
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

  const diff = income - expense;
  const positive = diff >= 0;

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

      <p
        className={cn(
          "num mt-3 text-center text-money-lg",
          positive ? "text-income" : "text-expense"
        )}
      >
        {monthSentence(income, expense)}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Figure label="Tiền vào" value={income} tone="in" />
        <Figure label="Tiền ra" value={expense} tone="out" />
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

function Figure({ label, value, tone }: { label: string; value: number; tone: "in" | "out" }) {
  const inbound = tone === "in";
  return (
    <div
      className={cn("rounded-lg px-3.5 py-2.5", inbound ? "bg-income-surface" : "bg-expense-surface")}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-label",
          inbound ? "text-income" : "text-expense"
        )}
      >
        {inbound ? <ArrowDownCircle className="size-4" /> : <ArrowUpCircle className="size-4" />}
        {label}
      </div>
      <div className="num mt-0.5 truncate text-money-row text-foreground">{formatMoney(value)}</div>
    </div>
  );
}
