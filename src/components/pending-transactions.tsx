"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, CloudOff, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UNKNOWN_AMOUNT_LONG, transactionAmountText } from "@/lib/copy";
import { createTransaction } from "@/lib/actions";
import { TransactionDetailDialog } from "@/components/transaction-detail";
import { TransactionAmount, type TransactionItem } from "@/components/transaction-list";
import {
  EditTransactionDialog,
  type CategoryOption,
  type EditableTransaction,
} from "@/components/transaction-dialog";
import { type MemberOption } from "@/lib/member";
import {
  flushPending,
  listPending,
  onPendingChanged,
  removePending,
  updatePending,
  type PendingTx,
} from "@/lib/offline-queue";
import { dateFromKey, formatDate } from "@/lib/utils";
import { rowClass } from "@/components/ui/row";

/** Nhãn + icon suy ra từ loại chính, y như lúc ghi mới trong `TransactionForm`. */
function labelOf(categories: CategoryOption[], categoryIds: string[], type: "INCOME" | "EXPENSE") {
  const primary = categories.find((c) => c.id === categoryIds[0]);
  return {
    label: primary?.name ?? (type === "INCOME" ? "Tiền vào" : "Tiền ra"),
    icon: primary?.icon ?? null,
  };
}

/**
 * Khoản đang chờ → đúng hình dạng mà màn chi tiết dùng cho khoản đã lên sổ.
 *
 * Dựng ở client chứ không hỏi server: cả tính năng này tồn tại cho lúc MẤT MẠNG,
 * nên chi tiết cũng phải đọc được lúc đó. Tên loại tra từ danh sách loại đã có
 * sẵn trên trang; loại nào không tra ra thì rơi về nhãn đã lưu kèm khoản.
 */
function asTransactionItem(
  i: PendingTx,
  categories: CategoryOption[],
  members: MemberOption[],
  currentUserId: string
): TransactionItem {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const person = (id: string | null | undefined) => {
    const m = members.find((x) => x.id === id);
    return m ? { id: m.id, name: m.name, email: m.email } : null;
  };
  // Hàng chờ nằm trong máy CỦA NGƯỜI GHI, không đồng bộ đi đâu — nên người ghi
  // khoản này chắc chắn là người đang mở app.
  const me = person(currentUserId) ?? { id: currentUserId, name: null, email: null };

  return {
    id: i.clientId,
    type: i.payload.type,
    amount: i.payload.amount,
    // `=== true` chứ không phải ép boolean: khoản xếp hàng từ trước bản có tính
    // năng này không mang trường đó — xem `PendingPayload`.
    amountUnknown: i.payload.amountUnknown === true,
    date: dateFromKey(i.payload.date),
    note: i.payload.note,
    categories: i.payload.categoryIds.map((id, idx) => {
      const c = byId.get(id);
      return {
        category: {
          id,
          name: c?.name ?? (idx === 0 ? i.label : "Loại đã chọn"),
          icon: c?.icon ?? (idx === 0 ? i.icon : null),
        },
      };
    }),
    createdBy: me,
    paidById: i.payload.paidById ?? null,
    paidBy: person(i.payload.paidById),
    splits: i.payload.splits ?? [],
  };
}

/**
 * Những khoản đã ghi nhưng chưa gửi được lên, kèm việc tự gửi lại.
 *
 * Vì sao phải HIỆN RA chứ không âm thầm gửi sau: khoản đang chờ không có trong
 * CSDL, nên danh sách do server vẽ không thấy nó. Nếu không có khối này thì người
 * dùng ghi lúc mất mạng, bấm Lưu, rồi nhìn xuống thấy sổ trống trơn — đúng cái
 * cảm giác "sổ không còn đúng" mà cả tính năng này ra để dẹp. Thấy nó nằm đó với
 * chữ "chờ gửi" thì mới tin được là chưa mất.
 *
 * Đặt Ở TRÊN danh sách, không phải dưới: nó là thứ mới nhất và là thứ duy nhất
 * cần người dùng để ý tới.
 *
 * Và nó là một KHOẢN BÌNH THƯỜNG, không phải một cái biên lai chỉ để ngắm: bấm
 * vào xem được chi tiết, sửa được, xoá được — cùng bộ hộp thoại mà danh sách
 * chính dùng. Ghi nhầm số tiền lúc mất mạng mà phải chờ có sóng mới sửa được thì
 * người dùng sẽ chờ bằng cách ghi thêm một khoản nữa cho đúng, rồi sổ có hai.
 */
export function PendingTransactions({
  groupId,
  categories,
  members,
  currentUserId,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
}) {
  const [items, setItems] = useState<PendingTx[]>([]);
  const [sending, setSending] = useState(false);
  // Giữ clientId chứ không giữ cả bản ghi: sửa xong thì hộp thoại chi tiết đọc
  // ngay bản mới, và khoản vừa gửi lên được thì hộp thoại tự đóng thay vì đứng
  // đó hiện một khoản không còn trong hàng chờ nữa.
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const byClientId = useMemo(() => new Map(items.map((i) => [i.clientId, i])), [items]);
  const detail = detailId ? byClientId.get(detailId) : null;
  const editing = editingId ? byClientId.get(editingId) : null;
  const deleting = deletingId ? byClientId.get(deletingId) : null;

  const refresh = useCallback(() => {
    listPending(groupId).then(setItems);
  }, [groupId]);

  // Đang mở một khoản ra xem/sửa/xoá thì KHÔNG được tự gửi sau lưng. Gửi xong là
  // khoản rời hàng chờ, bản sửa mà người dùng đang gõ sẽ ghi lại vào máy một
  // khoản đã lên sổ rồi — lần gửi sau `clientId` trùng nên server bỏ qua, và
  // sửa đổi của họ biến mất không dấu vết. Ref chứ không phải state để cái effect
  // nghe `online`/`visibilitychange` không phải gỡ ra gắn lại mỗi lần mở hộp thoại.
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = Boolean(detailId || editingId || deletingId);
  }, [detailId, editingId, deletingId]);

  const flush = useCallback(async () => {
    setSending(true);
    try {
      const sent = await flushPending((payload) => createTransaction(payload));
      // Chỉ refresh khi CÓ gửi được: `router.refresh()` là một lượt hỏi server
      // đầy đủ, gọi vô cớ mỗi lần app mở là tự làm chậm mình.
      if (sent > 0) {
        toast.success(sent === 1 ? "Đã gửi khoản chờ lên sổ" : `Đã gửi ${sent} khoản chờ lên sổ`);
        router.refresh();
      }
    } finally {
      setSending(false);
      refresh();
    }
  }, [refresh, router]);

  useEffect(() => {
    refresh();
    const off = onPendingChanged(refresh);
    return off;
  }, [refresh]);

  useEffect(() => {
    // Hai lối gửi lại, cố ý KHÔNG dùng Background Sync của service worker: iOS
    // không có nó, mà iOS là nửa số máy của app này.
    //  · mở app / quay lại tab — bắt được cả trường hợp mạng đã có lại từ lúc
    //    app đóng, khi không hề có sự kiện `online` nào bắn ra;
    //  · sự kiện `online` — bắt được lúc đang mở app mà sóng vừa về.
    const wake = () => {
      if (openRef.current) return;
      if (document.visibilityState === "visible") void flush();
    };
    wake();
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [flush]);

  if (items.length === 0) return null;

  const stuck = items.filter((i) => i.lastError).length;

  return (
    <section
      aria-label="Khoản chờ gửi"
      className="overflow-hidden rounded-xl border border-warning bg-card"
    >
      <div className="flex items-center gap-2 border-b border-border bg-warning-surface px-4 py-2.5">
        <CloudOff aria-hidden className="size-5 shrink-0 text-warning" />
        <p className="min-w-0 flex-1 text-label text-warning">
          {stuck > 0
            ? `${items.length} khoản chưa lên sổ`
            : `${items.length} khoản đang chờ gửi`}
        </p>
        {stuck < items.length && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={sending}
            aria-busy={sending}
            onClick={() => void flush()}
          >
            {sending ? "Đang gửi…" : "Gửi lại"}
          </Button>
        )}
      </div>

      <ul className="divide-y divide-border">
        {items.map((i) => {
          const inbound = i.payload.type === "INCOME";
          // Ghi lúc mất mạng VÀ chưa biết số tiền là chuyện hoàn toàn có thật (đi
          // chợ, đi ăn ở chỗ yếu sóng), nên hàng chờ cũng phải biết nói "Chưa rõ".
          // Máy đọc màn hình nhận câu ĐẦY ĐỦ, không nhận chữ "Chưa rõ" cụt của ô
          // hẹp: nhãn của một nút phải đứng một mình được, không dựa vào việc mắt
          // nhìn thấy mấy thứ quanh nó.
          const money = i.payload.amountUnknown
            ? UNKNOWN_AMOUNT_LONG
            : transactionAmountText({
                amount: i.payload.amount,
                amountUnknown: false,
                type: i.payload.type,
              });
          return (
            <li key={i.clientId}>
              {/* CẢ HÀNG là một nút, giống hệt hàng trong danh sách chính: cùng
                  một thứ thì phải bấm ra cùng một chỗ. Không nhét nút xoá vào
                  trong hàng — nút lồng nút, và trên điện thoại là bẫy bấm trượt
                  ngay cạnh thứ người dùng sợ mất nhất. */}
              <button
                type="button"
                onClick={() => setDetailId(i.clientId)}
                aria-label={`Xem chi tiết khoản chờ gửi ${i.label}, ${money}`}
                className={rowClass({ size: "tall" })}
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sunken text-title">
                  {i.icon ?? (inbound ? "💵" : "📦")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body-lg">{i.label}</div>
                  <div className="text-caption text-muted-foreground">
                    {i.lastError ? (
                      <span className="flex items-start gap-1.5 text-warning">
                        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                        <span className="min-w-0">Sổ không nhận: {i.lastError}</span>
                      </span>
                    ) : (
                      <span className="flex min-w-0 items-center gap-1.5">
                        {inbound ? (
                          <ArrowDownCircle className="size-4 shrink-0 text-income" />
                        ) : (
                          <ArrowUpCircle className="size-4 shrink-0 text-expense" />
                        )}
                        <span className="truncate">
                          Chờ gửi · {formatDate(i.payload.date)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <TransactionAmount
                  amount={i.payload.amount}
                  amountUnknown={i.payload.amountUnknown === true}
                  type={i.payload.type}
                />
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Đóng sheet đang mở TRƯỚC khi mở sheet kế tiếp: hai dialog cùng mở thì
          Radix khoá tiêu điểm ở cái cũ và cái mới không bấm được. */}
      {detail && (
        <TransactionDetailDialog
          transaction={asTransactionItem(detail, categories, members, currentUserId)}
          members={members}
          currentUserId={currentUserId}
          notice={
            <p className="flex items-start gap-2 rounded-lg bg-warning-surface px-3.5 py-3 text-body text-warning">
              <CloudOff aria-hidden className="mt-0.5 size-5 shrink-0" />
              <span>
                {detail.lastError
                  ? `Sổ chưa nhận khoản này: ${detail.lastError}`
                  : "Khoản này còn nằm trong máy, sẽ tự lên sổ khi có mạng."}
              </span>
            </p>
          }
          open
          onOpenChange={(o) => !o && setDetailId(null)}
          onEdit={() => {
            setEditingId(detail.clientId);
            setDetailId(null);
          }}
          onDelete={() => {
            setDeletingId(detail.clientId);
            setDetailId(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeletingId(null)}
          title={`Xoá khoản ${deleting.label}?`}
          // Nói rõ khoản này CHƯA lên sổ: xoá nó ở đây là bỏ hẳn, không phải
          // "huỷ gửi rồi lát nữa vẫn còn trong sổ".
          description={`${transactionAmountText({
            amount: deleting.payload.amount,
            amountUnknown: deleting.payload.amountUnknown === true,
            type: deleting.payload.type,
          })} ngày ${formatDate(deleting.payload.date)} còn nằm trong máy, chưa lên sổ. Xoá là mất hẳn, không lấy lại được.`}
          confirmLabel="Xoá khoản này"
          successMessage="Đã xoá khoản chờ gửi"
          onConfirm={() => removePending(deleting.clientId)}
        />
      )}

      {editing && (
        <EditTransactionDialog
          groupId={groupId}
          categories={categories}
          members={members}
          currentUserId={currentUserId}
          transaction={toEditable(editing)}
          // Sửa xong ghi thẳng lại vào hàng chờ — không gọi server, vì khoản này
          // chưa có id trên đó. Đây cũng là lý do sửa được lúc mất mạng: không có
          // bản nào của người khác để mà ghi đè.
          saveOverride={async (payload) => {
            await updatePending({
              ...editing,
              ...labelOf(categories, payload.categoryIds, payload.type),
              payload: { groupId, clientId: editing.clientId, ...payload },
            });
            // Thử gửi ngay. Khoản bị sổ từ chối thì sửa là để chữa đúng cái lý do
            // đó — bắt người dùng chờ tới lần `online` kế tiếp mới biết mình chữa
            // đúng chưa là bắt họ nhìn cùng một cảnh báo cũ mà không rõ đã xong.
            void flush();
          }}
          open
          onOpenChange={(o) => !o && setEditingId(null)}
        />
      )}
    </section>
  );
}

function toEditable(i: PendingTx): EditableTransaction {
  return {
    id: i.clientId,
    type: i.payload.type,
    amount: i.payload.amount,
    amountUnknown: i.payload.amountUnknown === true,
    date: dateFromKey(i.payload.date),
    categoryIds: i.payload.categoryIds,
    note: i.payload.note,
    paidById: i.payload.paidById ?? null,
    splits: i.payload.splits ?? [],
  };
}
