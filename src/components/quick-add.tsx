"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GroupBadge } from "@/components/group-badge";
import { Segmented } from "@/components/segmented";
import { TransactionForm, type CategoryOption } from "@/components/transaction-dialog";
import { LoanForm } from "@/components/loan-dialog";
import { type MemberOption } from "@/lib/member";
import { cn } from "@/lib/utils";

type Tab = "TX" | "LOAN";

/**
 * Nút "tạo mới" dùng chung cho cả hai loại bản ghi: giao dịch thu/chi và khoản
 * vay nợ, chọn bằng hai tab ở đầu sheet.
 *
 * `variant`:
 * - `fab` — đĩa "+" nổi đúng ô trống giữa thanh nav dưới (xem `AppNav`). Mount
 *   một lần trong layout nên **luôn** hiện trên điện thoại, ở mọi trang.
 * - `header` — nút thường trong header, chỉ từ md trở lên (mobile đã có FAB).
 */
export function QuickAddButton({
  groupId,
  groupName,
  categories,
  members,
  currentUserId,
  variant = "header",
  defaultTab,
}: {
  groupId: string;
  groupName: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  variant?: "fab" | "header";
  defaultTab?: Tab;
}) {
  const pathname = usePathname();
  // Đang ở trang Vay nợ thì mở sẵn tab Vay nợ — đỡ một cú bấm cho việc rõ ràng
  // là người dùng đang muốn làm.
  const initialTab: Tab = defaultTab ?? (pathname.startsWith("/loans") ? "LOAN" : "TX");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab);
  const fab = variant === "fab";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        // Mỗi lần mở lại đều bắt đầu từ tab mặc định của trang đang xem.
        if (v) setTab(initialTab);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="gradient"
          aria-label="Tạo mới"
          className={cn(
            fab
              ? "fixed bottom-[calc(env(safe-area-inset-bottom)+1.1rem)] left-1/2 z-40 size-14 -translate-x-1/2 p-0 md:hidden"
              : "hidden md:inline-flex"
          )}
        >
          <Plus className={fab ? "size-6" : "size-4"} />
          {!fab && <span>Ghi giao dịch</span>}
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>{tab === "TX" ? "Giao dịch mới" : "Khoản vay mới"}</DialogTitle>
          <GroupBadge groupName={groupName} />
        </DialogHeader>

        {/* Ngoài DialogHeader để tab không bị `pr-10` (chỗ chừa cho nút đóng) làm lệch */}
        <Segmented
          className="shrink-0"
          value={tab}
          onChange={setTab}
          options={[
            { value: "TX", label: "Thu chi" },
            { value: "LOAN", label: "Vay nợ" },
          ]}
        />

        {/* Chỉ mount khi mở → form luôn ở trạng thái sạch mỗi lần mở lại */}
        {open &&
          (tab === "TX" ? (
            <TransactionForm
              groupId={groupId}
              categories={categories}
              members={members}
              currentUserId={currentUserId}
              onDone={() => setOpen(false)}
            />
          ) : (
            <LoanForm groupId={groupId} onDone={() => setOpen(false)} />
          ))}
      </DialogContent>
    </Dialog>
  );
}
