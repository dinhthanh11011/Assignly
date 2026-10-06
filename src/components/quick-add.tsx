"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GroupBadge } from "@/components/group-badge";
import { TransactionForm, type CategoryOption } from "@/components/transaction-dialog";
import { LoanForm } from "@/components/loan-dialog";
import { type MemberOption } from "@/lib/member";
import { QUICK_ADD_EVENT, type QuickAddDetail, type TransactionTemplate } from "@/lib/quick-add";
import { formatDate, formatWeekday } from "@/lib/utils";

type Mode = "TX" | "LOAN";

/**
 * Nút "Ghi" + hộp thoại ghi khoản — MỘT bước: mở ra là form khoản chi, ô số
 * tiền đã focus. Chi/Thu gạt ngay trên đầu form; "Cho mượn / Đi mượn" là chip
 * phụ chuyển sang form khoản mượn.
 *
 * Mount MỘT lần trong khung app (xem `TopBar`) và vẽ hai nút dùng chung một
 * hộp thoại: nút nổi giữa thanh nav dưới (điện thoại) và nút trong thanh trên
 * (desktop). Nơi khác mở nó qua `openQuickAdd` (src/lib/quick-add.ts).
 */
export function QuickAddButton({
  groupId,
  groupName,
  categories,
  members,
  currentUserId,
}: {
  groupId: string;
  groupName: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("TX");
  // Mỗi lần mở là một form mới tinh (key), kể cả khi mở lại từ toast "Ghi tiếp".
  const [session, setSession] = useState(0);
  const [detail, setDetail] = useState<QuickAddDetail>({});

  const start = (next: QuickAddDetail) => {
    setDetail(next);
    setMode("TX");
    setSession((n) => n + 1);
    setOpen(true);
  };

  useEffect(() => {
    const onOpen = (e: Event) => start((e as CustomEvent<QuickAddDetail>).detail ?? {});
    window.addEventListener(QUICK_ADD_EVENT, onOpen);
    return () => window.removeEventListener(QUICK_ADD_EVENT, onOpen);
  }, []);

  const presetDate = detail.date ?? null;
  const template: TransactionTemplate | null = detail.template ?? null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Hai nút, một Dialog → không dùng DialogTrigger (nó chỉ nhận một con).
          Mở từ chính nút này luôn là khoản hôm nay — ngày còn sót từ lần mở
          trước (từ ô lịch) là cái bẫy "ghi nhầm ngày". */}
      {/* Nút nổi vẽ từ trong thanh trên (sticky + z = stacking context) nên thanh
          trên phải có z LỚN HƠN thanh nav dưới, xem TopBar. */}
      <Button
        size="lg"
        onClick={() => start({})}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.15rem)] left-1/2 z-40 h-16 w-16 -translate-x-1/2 flex-col gap-0 rounded-2xl p-0 shadow-lift md:hidden"
      >
        <Plus className="size-6" aria-hidden />
        <span className="text-caption leading-none">Ghi</span>
      </Button>

      <Button onClick={() => start({})} className="hidden md:inline-flex">
        <Plus aria-hidden />
        Ghi khoản
      </Button>

      <DialogContent className="overflow-y-hidden">
        <DialogHeader className="gap-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <DialogTitle>{mode === "LOAN" ? "Cho mượn / Đi mượn" : "Ghi khoản"}</DialogTitle>
            <GroupBadge groupName={groupName} />
          </div>
          <DialogDescription className={mode === "TX" ? "sr-only" : undefined}>
            {mode === "LOAN"
              ? "Tiền chưa trả, sẽ trả lại sau."
              : "Nhập số tiền, chọn loại rồi bấm Lưu."}
          </DialogDescription>
          {/* Ngày đặt sẵn phải NÓI RA ở đầu hộp thoại — người dùng vừa bấm một
              ô lịch, và ô ngày nằm giữa form thì dễ bỏ qua. */}
          {mode === "TX" && presetDate && (
            <p className="flex items-center gap-1.5 text-label text-primary">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              Ghi cho {formatWeekday(presetDate).toLowerCase()}, {formatDate(presetDate)}
            </p>
          )}
          {mode === "TX" && template && (
            <p className="flex items-center gap-1.5 text-label text-primary">
              <Copy className="size-4 shrink-0" aria-hidden />
              Chép từ “{template.label}” — xem lại số tiền rồi Lưu.
            </p>
          )}
          {mode === "LOAN" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("TX")}
              className="-ml-2 self-start text-muted-foreground"
            >
              <ArrowLeft aria-hidden />
              Quay lại ghi thu chi
            </Button>
          )}
        </DialogHeader>

        {/* Chỉ mount khi mở → form luôn sạch mỗi lần. LoanForm chưa nhận ngày
            đặt sẵn — khoản mượn có ngày riêng của nó. */}
        {open && mode === "LOAN" && <LoanForm groupId={groupId} onDone={() => setOpen(false)} />}
        {open && mode === "TX" && (
          <TransactionForm
            key={session}
            groupId={groupId}
            categories={categories}
            members={members}
            currentUserId={currentUserId}
            defaultType={detail.type}
            defaultDate={presetDate ?? undefined}
            template={template ?? undefined}
            onSwitchToLoan={template ? undefined : () => setMode("LOAN")}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
