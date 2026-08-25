"use client";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GroupBadge } from "@/components/group-badge";
import { TransactionForm, type CategoryOption } from "@/components/transaction-dialog";
import { LoanForm } from "@/components/loan-dialog";
import { type MemberOption } from "@/lib/member";
import { QUICK_ADD_EVENT, type QuickAddDetail } from "@/lib/quick-add";
import { cn, formatDate, formatWeekday } from "@/lib/utils";
import { rowClass } from "@/components/ui/row";

type Choice = "EXPENSE" | "INCOME" | "LOAN";

/**
 * Ghi một khoản mới.
 *
 * Bản cũ mở ra với hai tab `Thu chi | Vay nợ`. Đặt "vay nợ" ngang hàng với "thu
 * chi" như hai tab tự nó đã khó hiểu — chúng không cùng một loại việc, và chữ
 * "thu chi" thì không nói cho ai biết bên trong sẽ hỏi gì.
 *
 * Nay là ba lựa chọn to, mỗi cái một câu nói rõ khi nào dùng, kèm ví dụ đời
 * thường. Chọn xong là vào thẳng form đã set sẵn chiều — bỏ được luôn một bước
 * gạt Chi/Thu ở bên trong.
 *
 * Màn chọn hiện ở **mọi** trang. Bản trước ở trang Nợ thì mở thẳng form khoản
 * mượn cho "đỡ một cú bấm", nhưng thành ra cùng một nút "Ghi" lại ra hai thứ
 * khác nhau tuỳ đang đứng ở đâu — và ở trang Nợ vẫn có lúc muốn ghi khoản chi.
 *
 * Component mount MỘT lần trong khung app (xem `TopBar`) và tự mở ra hai nút cho
 * hai khổ màn hình, dùng chung một hộp thoại:
 * - điện thoại — nút "Ghi" nổi đúng ô trống giữa thanh nav dưới (xem `AppNav`);
 * - desktop — nút thường trong thanh trên, cạnh chuông. Bản trước KHÔNG mount
 *   nút này ở đâu cả, nên trên máy tính không còn đường nào ghi khoản mới.
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
  const [choice, setChoice] = useState<Choice | null>(null);
  // Ngày đặt sẵn khi hộp thoại được mở từ một ô lịch — xem `src/lib/quick-add.ts`.
  const [presetDate, setPresetDate] = useState<string | null>(null);
  const reset = (v: boolean) => {
    setOpen(v);
    if (v) {
      setChoice(null);
      // Mở từ chính nút này thì luôn là khoản của hôm nay: một ngày còn sót lại
      // từ lần mở trước (bấm từ ô lịch) là đúng cái bẫy "ghi nhầm ngày".
      setPresetDate(null);
    }
  };

  // Mở từ nơi khác trong app, kèm ngày sẵn — VD sheet một ngày trên lịch.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<QuickAddDetail>).detail ?? {};
      setPresetDate(detail.date ?? null);
      setChoice(null);
      setOpen(true);
    };
    window.addEventListener(QUICK_ADD_EVENT, onOpen);
    return () => window.removeEventListener(QUICK_ADD_EVENT, onOpen);
  }, []);

  const fab = (
    <Button
      size="lg"
      onClick={() => reset(true)}
      className={cn(
        // Nút nổi lấy bậc 2xl và bóng `shadow-lift` — nó NỔI THẬT trên
        // thanh nav, và ở 64px thì bo 12px của nút thường trông như một ô
        // vuông. Đây cũng là nút duy nhất trong app còn được mang bóng.
        "fixed bottom-[calc(env(safe-area-inset-bottom)+1.15rem)] left-1/2 z-40 h-16 w-16 -translate-x-1/2 flex-col gap-0 rounded-2xl p-0 shadow-lift md:hidden"
      )}
    >
      <Plus className="size-6" />
      {/* Cả nút nổi cũng có CHỮ. Bản cũ chỉ có dấu cộng trần. */}
      <span className="text-caption leading-none">Ghi</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={reset}>
      {/* Hai nút, một Dialog → không dùng DialogTrigger (nó chỉ nhận một con). */}
      {/* Nút nổi vẽ từ trong thanh trên (sticky + z-index = một stacking
          context) nên thanh trên phải có z LỚN HƠN thanh nav dưới, xem TopBar. */}
      {fab}

      {/* "Ghi khoản", cùng một từ với nút nổi trên điện thoại ("Ghi"): câu chỉ
          dẫn ở màn hình trống nhắc tới nút này bằng tên, nên hai nơi phải gọi
          nó cùng một cách. */}
      <Button onClick={() => reset(true)} className="hidden md:inline-flex">
        <Plus />
        Ghi khoản
      </Button>

      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>
            {choice === "EXPENSE"
              ? "Tôi tiêu tiền"
              : choice === "INCOME"
                ? "Tôi nhận tiền"
                : choice === "LOAN"
                  ? "Cho mượn / Đi mượn"
                  : "Ghi một khoản"}
          </DialogTitle>
          {/* Câu mô tả NHÌN THẤY ĐƯỢC, không sr-only: nó đổi theo bước đang
              đứng, nên nó vừa là chỗ dựa cho máy đọc màn hình vừa cho người
              nhìn biết mình đang ở đâu trong hai bước. */}
          <DialogDescription>
            {choice === null
              ? "Chọn loại việc, rồi điền số tiền — hai bước là xong."
              : choice === "LOAN"
                ? "Tiền chưa trả, sẽ trả lại sau."
                : "Điền số tiền, rồi chọn khoản này là gì."}
          </DialogDescription>
          <GroupBadge groupName={groupName} />
          {/* Ngày đặt sẵn phải NÓI RA ở đầu hộp thoại. Người dùng bấm một ô lịch
              rồi mới tới đây, và nếu không có dòng này thì thứ duy nhất cho biết
              khoản sắp ghi không rơi vào hôm nay là ô ngày nằm giữa form. */}
          {presetDate && (
            <p className="flex items-center gap-1.5 text-label text-primary">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              Ghi cho {formatWeekday(presetDate)}, {formatDate(presetDate)}
            </p>
          )}
        </DialogHeader>

        {/* DialogBody = vùng cuộn được. Panel sheet đặt overflow-y-hidden nên
            không có nó thì ở cỡ chữ lớn nhất trên máy màn ngắn, lựa chọn thứ ba
            bị cắt mà không cuộn tới được. */}
        {open && choice === null && (
          <DialogBody>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              <ChoiceRow
                emoji="💸"
                label="Tôi tiêu tiền"
                hint="Đi chợ, đổ xăng, trả tiền điện…"
                onClick={() => setChoice("EXPENSE")}
              />
              <ChoiceRow
                emoji="💰"
                label="Tôi nhận tiền"
                hint="Lương, bán hàng, ai đó cho…"
                onClick={() => setChoice("INCOME")}
              />
              <ChoiceRow
                emoji="🤝"
                label="Cho mượn / Đi mượn"
                hint="Tiền chưa trả, sẽ trả lại sau"
                onClick={() => setChoice("LOAN")}
              />
            </div>
          </DialogBody>
        )}

        {/* Chỉ mount khi đã chọn → form luôn ở trạng thái sạch mỗi lần mở lại */}
        {/* LoanForm chưa nhận ngày đặt sẵn — khoản mượn có ngày riêng của nó và
            màn này không phải chỗ chốt việc đó. */}
        {open && choice === "LOAN" && <LoanForm groupId={groupId} onDone={() => setOpen(false)} />}
        {open && (choice === "EXPENSE" || choice === "INCOME") && (
          <TransactionForm
            groupId={groupId}
            categories={categories}
            members={members}
            currentUserId={currentUserId}
            defaultType={choice}
            defaultDate={presetDate ?? undefined}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChoiceRow({
  emoji,
  label,
  hint,
  onClick,
}: {
  emoji: string;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={rowClass({ size: "tall" })}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sunken text-page">
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-lg">{label}</span>
        {/* Không `truncate`: đây là CÂU ví dụ nói khi nào chọn mục này. Ở cỡ
            chữ lớn trên màn hẹp bản cũ cắt thành "Đi chợ, đổ x…", tức mất đúng
            phần làm cho ba lựa chọn khác nhau. */}
        <span className="block text-caption text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
