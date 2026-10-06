"use client";
import { useEffect, useMemo, useState } from "react";
import { call } from "@/lib/action-result";
import { loadCategoryTransactions } from "@/lib/actions";
import { makeShortNamer, type MemberOption } from "@/lib/member";
import { CategoryBarList } from "@/components/report-charts";
import { DayRow } from "@/components/day-detail-dialog";
import { useTransactionActions } from "@/components/transaction-actions";
import type { CategoryOption } from "@/components/transaction-dialog";
import type { TransactionItem } from "@/components/transaction-list";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatMoney } from "@/lib/utils";

/** Một hàng của biểu đồ theo loại. `id: null` là nhóm "Chưa ghi là gì". */
export type CategoryRow = { id: string | null; name: string; value: number; color?: string };

/**
 * Danh sách thanh ngang theo loại của trang báo cáo, BẤM ĐƯỢC: bấm một loại là
 * mở sheet liệt kê mọi khoản của loại đó trong khoảng đang xem.
 *
 * Cùng luật với sheet một ngày bên lịch (`month-calendar.tsx`): bấm một khoản
 * trong sheet thì sheet GỠ HẲN khỏi cây để nhường chỗ cho chuỗi chi tiết
 * (`useTransactionActions`) — hai Radix dialog cùng mở là tiêu điểm khoá ở cái
 * cũ — và chuỗi đóng lại thì sheet mở lại đúng loại đó, tải lại từ đầu vì khoản
 * vừa rồi có thể đã bị sửa hay xoá.
 */
export function CategoryDrilldown({
  rows,
  total,
  limit,
  type,
  range,
  rangeLabel,
  groupId,
  categories,
  members,
  currentUserId,
}: {
  rows: CategoryRow[];
  total: number;
  limit?: number;
  type: "INCOME" | "EXPENSE";
  /** Khoảng của trang báo cáo, "YYYY-MM-DD". */
  range: { from: string; until: string };
  rangeLabel: string;
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
}) {
  const [picked, setPicked] = useState<CategoryRow | null>(null);
  const actions = useTransactionActions({
    groupId,
    categories,
    members,
    currentUserId,
    // "Ghi lại khoản này" mở hộp thoại ghi khoản — sheet không được bật lại cùng lúc.
    onHandOff: () => setPicked(null),
  });

  return (
    <>
      <CategoryBarList rows={rows} total={total} limit={limit} onPick={setPicked} />

      {picked && !actions.active && (
        <CategoryTransactionsDialog
          key={picked.id ?? "none"}
          row={picked}
          type={type}
          rangeLabel={rangeLabel}
          members={members}
          load={() =>
            call(loadCategoryTransactions(groupId, { ...range, type, categoryId: picked.id })).then(
              (res) => ({ ...res, items: res.items as unknown as TransactionItem[] })
            )
          }
          onOpenChange={(o) => !o && setPicked(null)}
          onPick={actions.open}
        />
      )}

      {actions.dialogs}
    </>
  );
}

function CategoryTransactionsDialog({
  row,
  type,
  rangeLabel,
  members,
  load,
  onOpenChange,
  onPick,
}: {
  row: CategoryRow;
  type: "INCOME" | "EXPENSE";
  rangeLabel: string;
  members: MemberOption[];
  load: () => Promise<{ items: TransactionItem[]; hasMore: boolean }>;
  onOpenChange: (open: boolean) => void;
  onPick: (t: TransactionItem) => void;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; items: TransactionItem[]; hasMore: boolean }
  >({ status: "loading" });

  // Mount = vừa mở loại này (có `key` theo loại ở phía trên), nên tải đúng một lần.
  useEffect(() => {
    let alive = true;
    load()
      .then((res) => alive && setState({ status: "done", ...res }))
      .catch((e: Error) => alive && setState({ status: "error", message: e.message }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shared = members.length > 1;
  const shortName = useMemo(() => makeShortNamer(members), [members]);
  // Khoản mang nhiều loại chỉ được cộng MỘT PHẦN vào hàng này (chia đều, xem
  // `sumByCategory`) — nói ra, nếu không cộng tay các hàng sẽ ra số lớn hơn.
  const splitAcross =
    state.status === "done" && state.items.some((t) => t.categories.length > 1);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{row.name}</DialogTitle>
          <DialogDescription>
            {rangeLabel} · {type === "INCOME" ? "vào" : "ra"}{" "}
            <span className="num">{formatMoney(row.value)}</span>
            {state.status === "done" && ` · ${state.items.length}${state.hasMore ? "+" : ""} khoản`}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {state.status === "loading" && (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {state.status === "error" && <p className="text-body text-expense">{state.message}</p>}

          {state.status === "done" && (
            <>
              {state.items.length > 0 ? (
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {state.items.map((t) => (
                    <DayRow
                      key={t.id}
                      t={t}
                      shared={shared}
                      shortName={shortName}
                      dateLabel={formatDate(new Date(t.date))}
                      onPick={() => onPick(t)}
                    />
                  ))}
                </div>
              ) : (
                // Báo cáo vừa đếm ra hàng này mà giờ trống: có người vừa sửa/xoá.
                <p className="text-body text-muted-foreground">
                  Không còn khoản nào — có thể vừa được sửa hoặc xoá.
                </p>
              )}

              {splitAcross && (
                <p className="text-caption text-muted-foreground">
                  Khoản ghi nhiều loại chỉ được tính một phần vào {row.name}, chia đều cho các loại của
                  nó.
                </p>
              )}
              {state.hasMore && (
                <p className="text-caption text-muted-foreground">
                  Chỉ hiện {state.items.length} khoản mới nhất.
                </p>
              )}
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
