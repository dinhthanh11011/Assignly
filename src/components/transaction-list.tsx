"use client";
import { useMemo, useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EditTransactionDialog,
  type CategoryOption,
  type EditableTransaction,
} from "@/components/transaction-dialog";
import { deleteTransaction, loadTransactions } from "@/lib/actions";
import { cn, dateKey, formatDayHeading, formatMoney, today } from "@/lib/utils";

export type TransactionItem = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: Date;
  note: string | null;
  categoryId: string | null;
  category: { id: string; name: string; icon: string | null } | null;
  createdBy: { id: string; name: string | null; email: string | null };
};

/** "Hôm nay" / "Hôm qua" cho hai ngày gần nhất, còn lại là thứ + ngày. */
function dayLabel(key: string) {
  const diff = Math.round((today().getTime() - new Date(key + "T00:00:00Z").getTime()) / 86_400_000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return formatDayHeading(key);
}

/** Danh sách giao dịch nhóm theo ngày, có sửa/xoá và “xem thêm”. */
export function TransactionList({
  groupId,
  categories,
  items: initialItems,
  nextCursor: initialCursor,
  filter,
  emptyText = "Chưa có giao dịch nào.",
}: {
  groupId: string;
  categories: CategoryOption[];
  items: TransactionItem[];
  nextCursor: string | null;
  filter: { month?: string; type?: "INCOME" | "EXPENSE"; categoryId?: string; q?: string };
  emptyText?: string;
}) {
  // Trang đầu luôn đến từ server; các trang sau giữ ở client.
  const [older, setOlder] = useState<TransactionItem[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<EditableTransaction | null>(null);

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

  function remove(id: string) {
    start(async () => {
      try {
        await deleteTransaction(id);
        setOlder((prev) => prev.filter((t) => t.id !== id));
        toast.success("Đã xoá giao dịch");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <p className="text-4xl">🧾</p>
        <p className="mt-3.5 text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map(([day, rows]) => {
        const net = rows.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);
        return (
          <section key={day}>
            {/* Tiêu đề ngày dạng viên thuốc kính — nổi rõ khi dính trên đầu danh sách */}
            <div className="day-sticky flex items-center justify-between gap-2 py-1.5">
              <h3 className="glass rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
                {dayLabel(day)}
              </h3>
              <span
                className={cn(
                  "num-lg rounded-full px-2.5 py-1 text-xs font-bold",
                  net >= 0 ? "bg-income/14 text-income" : "bg-expense/14 text-expense"
                )}
              >
                {net >= 0 ? "+" : "−"}
                {formatMoney(Math.abs(net))}
              </span>
            </div>

            <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-hairline bg-card shadow-soft">
              {rows.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-sunken/60"
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-lg text-lg",
                      t.type === "INCOME" ? "bg-income/14" : "bg-sunken"
                    )}
                  >
                    {t.category?.icon ?? (t.type === "INCOME" ? "💵" : "📦")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {t.category?.name ?? "Chưa phân loại"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.note || t.createdBy.name || t.createdBy.email || ""}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "num-lg shrink-0 text-[15px] font-bold",
                      t.type === "INCOME" ? "text-income" : "text-foreground"
                    )}
                  >
                    {t.type === "INCOME" ? "+" : "−"}
                    {formatMoney(t.amount)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
                        aria-label="Tuỳ chọn giao dịch"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          setEditing({
                            id: t.id,
                            type: t.type,
                            amount: t.amount,
                            date: new Date(t.date),
                            categoryId: t.categoryId,
                            note: t.note,
                          })
                        }
                      >
                        <Pencil className="size-4" /> Sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => remove(t.id)}>
                        <Trash2 className="size-4" /> Xoá
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {cursor && (
        <Button variant="secondary" className="w-full" disabled={pending} onClick={loadMore}>
          {pending ? "Đang tải…" : "Xem thêm"}
        </Button>
      )}

      {editing && (
        <EditTransactionDialog
          groupId={groupId}
          categories={categories}
          transaction={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}
