"use client";
import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Copy,
  HandCoins,
  HandHelping,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GroupBadge } from "@/components/group-badge";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { TransactionForm, type CategoryOption } from "@/components/transaction-dialog";
import { LoanForm } from "@/components/loan-dialog";
import { type MemberOption } from "@/lib/member";
import { QUICK_ADD_EVENT, type QuickAddDetail, type TransactionTemplate } from "@/lib/quick-add";
import { cn, formatDate, formatWeekday } from "@/lib/utils";

/** Bốn việc người dùng có thể ghi — đứng NGANG HÀNG ở đầu sheet. */
type Kind = "EXPENSE" | "INCOME" | "LEND" | "BORROW";

const KINDS: { value: Kind; label: string; icon: React.ElementType; tone: "expense" | "income" | "primary" }[] = [
  { value: "EXPENSE", label: "Chi", icon: ArrowUpRight, tone: "expense" },
  { value: "INCOME", label: "Thu", icon: ArrowDownLeft, tone: "income" },
  { value: "LEND", label: "Cho mượn", icon: HandHelping, tone: "primary" },
  { value: "BORROW", label: "Đi mượn", icon: HandCoins, tone: "primary" },
];

const KIND_HINT: Record<Kind, string> = {
  EXPENSE: "Tiền bạn tiêu ra.",
  INCOME: "Tiền bạn nhận vào.",
  LEND: "Bạn đưa tiền cho người khác, họ sẽ trả lại sau.",
  BORROW: "Bạn mượn tiền của người khác, sẽ trả lại sau.",
};

/**
 * Nút "Ghi" + hộp thoại ghi khoản — MỘT bước: mở ra là form khoản chi, ô số
 * tiền đã focus. Đầu sheet là hàng bốn ô Chi · Thu · Cho mượn · Đi mượn, đặt
 * ngang hàng nhau: trước đây "Cho mượn / Đi mượn" chỉ là một chip phụ nhỏ và
 * người dùng không nhận ra là ghi khoản mượn ở đây được.
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
  const [kind, setKind] = useState<Kind>("EXPENSE");
  // Mỗi lần mở là một form mới tinh (key), kể cả khi mở lại từ toast "Ghi tiếp".
  const [session, setSession] = useState(0);
  const [detail, setDetail] = useState<QuickAddDetail>({});

  const start = (next: QuickAddDetail) => {
    setDetail(next);
    setKind(next.type ?? "EXPENSE");
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
  const isLoan = kind === "LEND" || kind === "BORROW";

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
        <DialogHeader className="gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <DialogTitle>Ghi khoản</DialogTitle>
            <GroupBadge groupName={groupName} />
          </div>
          <ChoiceGroup
            label="Bạn muốn ghi gì?"
            value={kind}
            onChange={setKind}
            options={KINDS}
            renderOption={(o, { active }) => (
              <span className="flex min-w-0 flex-col items-center gap-0.5 py-1 text-center">
                {o.icon && <o.icon className="size-5 shrink-0" aria-hidden />}
                <span className={cn("text-caption leading-tight", active && "font-semibold")}>
                  {o.label}
                </span>
              </span>
            )}
          />
          <DialogDescription>{KIND_HINT[kind]}</DialogDescription>
          {/* Ngày đặt sẵn phải NÓI RA ở đầu hộp thoại — người dùng vừa bấm một
              ô lịch, và ô ngày nằm giữa form thì dễ bỏ qua. */}
          {!isLoan && presetDate && (
            <p className="flex items-center gap-1.5 text-label text-primary">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              Ghi cho {formatWeekday(presetDate).toLowerCase()}, {formatDate(presetDate)}
            </p>
          )}
          {!isLoan && template && (
            <p className="flex items-center gap-1.5 text-label text-primary">
              <Copy className="size-4 shrink-0" aria-hidden />
              Chép từ “{template.label}” — xem lại số tiền rồi Lưu.
            </p>
          )}
        </DialogHeader>

        {/* Chỉ mount khi mở → form luôn sạch mỗi lần. Chi ↔ Thu không mount lại
            (giữ số tiền đã gõ); sang khoản mượn là một form khác. */}
        {open && isLoan && (
          <LoanForm
            key={`loan-${session}`}
            groupId={groupId}
            type={kind as "LEND" | "BORROW"}
            onDone={() => setOpen(false)}
          />
        )}
        {open && !isLoan && (
          <TransactionForm
            key={session}
            groupId={groupId}
            categories={categories}
            members={members}
            currentUserId={currentUserId}
            type={kind as "EXPENSE" | "INCOME"}
            defaultDate={presetDate ?? undefined}
            template={template ?? undefined}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
