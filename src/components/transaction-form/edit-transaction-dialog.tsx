"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type MemberOption } from "@/lib/member";
import { TransactionForm } from "./transaction-form";
import type { CategoryOption, EditableTransaction, TransactionFormPayload } from "./types";

export function EditTransactionDialog({
  groupId,
  categories,
  members,
  currentUserId,
  transaction,
  saveOverride,
  open,
  onOpenChange,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  transaction: EditableTransaction;
  /** Có mặt = đang sửa khoản còn trong hàng chờ; xem `TransactionForm`. */
  saveOverride?: (payload: TransactionFormPayload) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>Sửa khoản này</DialogTitle>
          <DialogDescription>
            {saveOverride
              ? "Khoản này còn nằm trong máy, chưa lên sổ. Sửa xong sẽ gửi bản mới khi có mạng."
              : "Đổi số tiền, loại, ngày hoặc cách chia rồi bấm “Lưu thay đổi”."}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <TransactionForm
            groupId={groupId}
            categories={categories}
            members={members}
            currentUserId={currentUserId}
            initial={transaction}
            saveOverride={saveOverride}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
