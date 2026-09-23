"use client";
import { call } from "@/lib/action-result";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FillAmountDialog } from "@/components/fill-amount-dialog";
import { TransactionDetailDialog } from "@/components/transaction-detail";
import {
  EditTransactionDialog,
  type CategoryOption,
  type EditableTransaction,
} from "@/components/transaction-dialog";
import type { TransactionItem } from "@/components/transaction-list";
import { transactionAmountText } from "@/lib/copy";
import { deleteTransaction } from "@/lib/actions";
import { type MemberOption } from "@/lib/member";
import { categoryLabel, formatDate } from "@/lib/utils";

/**
 * MỌI VIỆC LÀM ĐƯỢC VỚI MỘT KHOẢN, gói thành một chỗ duy nhất: mở chi tiết, rồi
 * từ chi tiết đi ra sửa / xoá / điền số tiền.
 *
 * Trước đây chuỗi bốn hộp thoại này nằm nguyên trong `TransactionList`, nên chỗ
 * nào muốn "bấm vào một khoản" cũng phải dựng một `TransactionList` — kể cả nơi
 * đã có sẵn danh sách riêng, như sheet của một ngày trong lịch. Tách ra đây để
 * hai nơi dùng CHUNG một chuỗi: cùng thứ tự hộp thoại, cùng câu hỏi trước khi
 * xoá, cùng luật "đóng cái cũ trước khi mở cái mới".
 *
 * LUẬT ĐÓNG-TRƯỚC-MỞ-SAU là thứ không được gỡ: hai Radix dialog cùng mở thì
 * tiêu điểm bị khoá ở cái mở trước, và cái mới hiện ra nhưng KHÔNG bấm được.
 * Vì thế mỗi lần chuyển bước đều `setDetail(null)` trong cùng một lượt cập nhật
 * với việc mở bước kế.
 *
 * `active` nói "chuỗi này đang chiếm màn hình" — người gọi nào tự nó cũng là một
 * dialog (sheet của một ngày) phải dựa vào đó mà tự đóng mình lại, rồi mở lại khi
 * `onClosed` bắn ra.
 */
export function useTransactionActions({
  groupId,
  categories,
  members,
  currentUserId,
  onDeleted,
  onClosed,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  /** Vừa xoá xong một khoản — để danh sách gọi bỏ nó ra khỏi phần đang giữ ở client. */
  onDeleted?: (id: string) => void;
  /**
   * Chuỗi vừa đóng hẳn. Khoản có thể đã bị sửa/xoá/điền tiền trong lúc đó, nên
   * nơi nào đang giữ dữ liệu ở client thì đây là lúc tải lại.
   */
  onClosed?: () => void;
}) {
  const [detail, setDetail] = useState<TransactionItem | null>(null);
  const [editing, setEditing] = useState<EditableTransaction | null>(null);
  const [deleting, setDeleting] = useState<TransactionItem | null>(null);
  const [filling, setFilling] = useState<TransactionItem | null>(null);

  const active = !!(detail || editing || deleting || filling);

  // Chỉ chạy khi một hộp thoại bị ĐÓNG thật sự. Lúc chuyển bước (chi tiết → sửa)
  // bước cũ được gỡ bằng setState thẳng, không đi qua `onOpenChange`, nên không
  // có chuyện `onClosed` bắn ra giữa chuỗi.
  function close(clear: () => void) {
    clear();
    onClosed?.();
  }

  const dialogs = (
    <>
      {/* Chi tiết mở trước, sửa/xoá/điền tiền đều đi ra từ đó. */}
      {detail && (
        <TransactionDetailDialog
          transaction={detail}
          members={members}
          currentUserId={currentUserId}
          open
          onOpenChange={(o) => !o && close(() => setDetail(null))}
          onFill={() => {
            setFilling(detail);
            setDetail(null);
          }}
          onEdit={() => {
            setEditing({
              id: detail.id,
              type: detail.type,
              amount: detail.amount,
              amountUnknown: detail.amountUnknown,
              date: new Date(detail.date),
              categoryIds: detail.categories.map((c) => c.category.id),
              note: detail.note,
              paidById: detail.paidById,
              splits: detail.splits,
              splitMode: detail.splitMode,
              version: detail.version,
            });
            setDetail(null);
          }}
          onDelete={() => {
            setDeleting(detail);
            setDetail(null);
          }}
        />
      )}

      {/* Xoá một khoản là mất hẳn, không hoàn lại được — phải hỏi, và phải nói
          rõ đang xoá khoản nào. */}
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close(() => setDeleting(null))}
          title={`Xoá khoản ${categoryLabel(deleting)}?`}
          description={`${transactionAmountText(deleting)} ngày ${formatDate(deleting.date)} sẽ bị xoá hẳn, không lấy lại được.`}
          confirmLabel="Xoá khoản này"
          successMessage="Đã xoá khoản này"
          onConfirm={async () => {
            await call(deleteTransaction(deleting.id, deleting.version));
            onDeleted?.(deleting.id);
          }}
        />
      )}

      {filling && (
        <FillAmountDialog
          transaction={filling}
          members={members}
          currentUserId={currentUserId}
          open
          onOpenChange={(o) => !o && close(() => setFilling(null))}
        />
      )}

      {editing && (
        <EditTransactionDialog
          groupId={groupId}
          categories={categories}
          members={members}
          currentUserId={currentUserId}
          transaction={editing}
          open
          onOpenChange={(o) => !o && close(() => setEditing(null))}
        />
      )}
    </>
  );

  return { open: (t: TransactionItem) => setDetail(t), active, dialogs };
}
