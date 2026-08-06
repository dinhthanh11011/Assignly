"use client";
import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GroupBadge } from "@/components/group-badge";
import { TransactionForm, type CategoryOption } from "@/components/transaction-dialog";
import { LoanForm } from "@/components/loan-dialog";
import { type MemberOption } from "@/lib/member";
import { cn } from "@/lib/utils";

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
 * `variant`:
 * - `fab` — nút "Ghi" nổi đúng ô trống giữa thanh nav dưới (xem `AppNav`).
 *   Mount một lần trong layout nên luôn có mặt trên điện thoại, ở mọi trang.
 * - `header` — nút thường trong header, chỉ từ md trở lên (mobile đã có FAB).
 */
export function QuickAddButton({
  groupId,
  groupName,
  categories,
  members,
  currentUserId,
  variant = "header",
}: {
  groupId: string;
  groupName: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  variant?: "fab" | "header";
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  const fab = variant === "fab";

  const reset = (v: boolean) => {
    setOpen(v);
    if (v) setChoice(null);
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className={cn(
            fab
              ? "fixed bottom-[calc(env(safe-area-inset-bottom)+1.15rem)] left-1/2 z-40 h-16 w-16 -translate-x-1/2 flex-col gap-0 p-0 md:hidden"
              : "hidden md:inline-flex"
          )}
        >
          <Plus className={fab ? "size-6" : undefined} />
          {/* Cả nút nổi cũng có CHỮ. Bản cũ chỉ có dấu cộng trần. */}
          <span className={fab ? "text-caption leading-none" : undefined}>Ghi</span>
        </Button>
      </DialogTrigger>

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
          <GroupBadge groupName={groupName} />
        </DialogHeader>

        {/* DialogBody = vùng cuộn được. Panel sheet đặt overflow-y-hidden nên
            không có nó thì ở cỡ chữ lớn nhất trên máy màn ngắn, lựa chọn thứ ba
            bị cắt mà không cuộn tới được. */}
        {open && choice === null && (
          <DialogBody>
            <div className="divide-y divide-border overflow-hidden rounded-xl border-[1.5px] border-border">
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
        {open && choice === "LOAN" && <LoanForm groupId={groupId} onDone={() => setOpen(false)} />}
        {open && (choice === "EXPENSE" || choice === "INCOME") && (
          <TransactionForm
            groupId={groupId}
            categories={categories}
            members={members}
            currentUserId={currentUserId}
            defaultType={choice}
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
      className="flex min-h-20 w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sunken text-page">
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-lg">{label}</span>
        <span className="block truncate text-caption text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
