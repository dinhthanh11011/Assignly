"use client";
import { useMemo, useState, useTransition } from "react";
import { ArrowDownCircle, ArrowUpCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { signedMoney } from "@/lib/copy";
import { TransactionDetailDialog } from "@/components/transaction-detail";
import {
  EditTransactionDialog,
  type CategoryOption,
  type EditableTransaction,
} from "@/components/transaction-dialog";
import { memberLabel, type MemberOption } from "@/lib/member";
import { deleteTransaction, loadTransactions } from "@/lib/actions";
import {
  categoryLabel,
  cn,
  dateKey,
  formatDayHeading,
  formatDate,
  today,
} from "@/lib/utils";

export type TransactionItem = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: Date;
  note: string | null;
  categories: { category: { id: string; name: string; icon: string | null } }[];
  createdBy: { id: string; name: string | null; email: string | null };
  paidById: string | null;
  paidBy: { id: string; name: string | null; email: string | null } | null;
  splits: { userId: string; weight: number; amount: number | null }[];
};

/** Dòng phụ dưới tên loại: ai bỏ tiền, chia mấy người, rồi tới ghi chú. */
function subtitle(t: TransactionItem, shared: boolean) {
  if (!shared) return t.note || t.createdBy.name || t.createdBy.email || "";
  const payer = t.paidBy ?? t.createdBy;
  const parts = [
    `${memberLabel({ ...payer, image: null })} ${t.type === "INCOME" ? "cầm tiền" : "bỏ tiền"}`,
  ];
  if (t.splits.length > 1) parts.push(`chia ${t.splits.length} người`);
  if (t.note) parts.push(t.note);
  return parts.join(" · ");
}

/** "Hôm nay" / "Hôm qua" cho hai ngày gần nhất, còn lại là thứ + ngày. */
function dayLabel(key: string) {
  const diff = Math.round((today().getTime() - new Date(key + "T00:00:00Z").getTime()) / 86_400_000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return formatDayHeading(key);
}

/**
 * Danh sách khoản nhóm theo ngày. Bấm một hàng là mở chi tiết khoản đó
 * (`TransactionDetailDialog`), và sửa/xoá đi ra từ trong chi tiết.
 */
export function TransactionList({
  groupId,
  categories,
  members,
  currentUserId,
  items: initialItems,
  nextCursor: initialCursor,
  filter,
  emptyText = "Chưa có khoản nào.",
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  items: TransactionItem[];
  nextCursor: string | null;
  filter: {
    month?: string;
    day?: string;
    type?: "INCOME" | "EXPENSE";
    categoryId?: string;
    q?: string;
  };
  emptyText?: string;
}) {
  const shared = members.length > 1;
  // Trang đầu luôn đến từ server; các trang sau giữ ở client.
  const [older, setOlder] = useState<TransactionItem[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, start] = useTransition();
  const [detail, setDetail] = useState<TransactionItem | null>(null);
  const [editing, setEditing] = useState<EditableTransaction | null>(null);
  const [deleting, setDeleting] = useState<TransactionItem | null>(null);

  const items = useMemo(() => {
    const seen = new Set<string>();
    return [...initialItems, ...older].filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [initialItems, older]);

  const days = useMemo(() => {
    const map = new Map<string, TransactionItem[]>();
    for (const t of items) {
      const key = dateKey(new Date(t.date));
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [items]);

  function loadMore() {
    if (!cursor) return;
    start(async () => {
      try {
        const page = await loadTransactions(groupId, filter, cursor);
        setOlder((prev) => [...prev, ...(page.items as unknown as TransactionItem[])]);
        setCursor(page.nextCursor);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <p className="text-4xl">🧾</p>
        <p className="mt-3.5 text-body text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map(([day, rows]) => {
        const net = rows.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);
        return (
          <section key={day}>
            {/* Tiêu đề ngày dạng viên thuốc đục — nổi rõ khi dính trên đầu danh sách */}
            <div className="day-sticky flex items-center justify-between gap-2 py-1.5">
              <h3 className="surface-float rounded-lg px-3.5 py-1.5 text-label">
                {dayLabel(day)}
              </h3>
              <span
                className={cn(
                  "num inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label",
                  net >= 0 ? "bg-income-surface text-income" : "bg-expense-surface text-expense"
                )}
              >
                {net >= 0 ? (
                  <ArrowDownCircle className="size-4" />
                ) : (
                  <ArrowUpCircle className="size-4" />
                )}
                {signedMoney(net, net >= 0 ? "in" : "out")}
              </span>
            </div>

            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {rows.map((t) => {
                const inbound = t.type === "INCOME";
                return (
                  // CẢ HÀNG là một nút mở chi tiết — mục tiêu bấm rộng bằng màn
                  // hình, không phải một cái "⋮" 44px ở góc phải.
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDetail(t)}
                    aria-label={`Xem chi tiết khoản ${categoryLabel(t)}, ${signedMoney(t.amount, inbound ? "in" : "out")}`}
                    className="flex min-h-[76px] w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring active:bg-sunken"
                  >
                    <span
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-lg text-title",
                        inbound ? "bg-income-surface" : "bg-sunken"
                      )}
                    >
                      {t.categories[0]?.category.icon ?? (inbound ? "💵" : "📦")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-body-lg">{categoryLabel(t)}</div>
                      <div className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
                        {/* Dấu hiệu thứ ba: một TỪ. Cùng với dấu +/− và mũi tên,
                            thu vs chi vẫn đọc ra được khi bỏ hết màu đi. */}
                        {inbound ? (
                          <ArrowDownCircle className="size-4 shrink-0 text-income" />
                        ) : (
                          <ArrowUpCircle className="size-4 shrink-0 text-expense" />
                        )}
                        <span className="shrink-0">{inbound ? "Tiền vào" : "Tiền ra"}</span>
                        {subtitle(t, shared) && (
                          <span className="truncate">· {subtitle(t, shared)}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "num shrink-0 text-money-row",
                        inbound ? "text-income" : "text-expense"
                      )}
                    >
                      {signedMoney(t.amount, inbound ? "in" : "out")}
                    </span>
                    {/* Mũi tên nói "bấm được, còn nữa ở trong" — luôn hiện, kể cả
                        khi không rê chuột (điện thoại không có hover). */}
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {cursor && (
        <Button
          variant="secondary"
          className="w-full"
          disabled={pending}
          aria-busy={pending}
          onClick={loadMore}
        >
          {pending ? "Đang tải…" : "Xem những khoản cũ hơn"}
        </Button>
      )}

      {/* Chi tiết mở trước, sửa/xoá đi ra từ đó. Đóng sheet chi tiết TRƯỚC khi
          mở sheet kế tiếp: hai dialog cùng mở thì Radix khoá tiêu điểm ở cái cũ
          và cái mới không bấm được. */}
      {detail && (
        <TransactionDetailDialog
          transaction={detail}
          members={members}
          currentUserId={currentUserId}
          open
          onOpenChange={(o) => !o && setDetail(null)}
          onEdit={() => {
            setEditing({
              id: detail.id,
              type: detail.type,
              amount: detail.amount,
              date: new Date(detail.date),
              categoryIds: detail.categories.map((c) => c.category.id),
              note: detail.note,
              paidById: detail.paidById,
              splits: detail.splits,
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
          rõ đang xoá khoản nào. Bản cũ xoá thẳng khi bấm vào mục trong menu. */}
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          title={`Xoá khoản ${categoryLabel(deleting)}?`}
          description={`${signedMoney(deleting.amount, deleting.type === "INCOME" ? "in" : "out")} ngày ${formatDate(deleting.date)} sẽ bị xoá hẳn, không lấy lại được.`}
          confirmLabel="Xoá khoản này"
          successMessage="Đã xoá khoản này"
          onConfirm={async () => {
            await deleteTransaction(deleting.id);
            setOlder((prev) => prev.filter((t) => t.id !== deleting.id));
          }}
        />
      )}

      {editing && (
        <EditTransactionDialog
          groupId={groupId}
          categories={categories}
          members={members}
          currentUserId={currentUserId}
          transaction={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}
