"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { call } from "@/lib/action-result";
import { loadTransactions } from "@/lib/actions";
import type { TransactionFilter } from "@/lib/queries";
import { makeShortNamer, type MemberOption } from "@/lib/member";
import { CategoryBarList } from "@/components/report-charts";
import { DayRow, LoadMoreButton, type TransactionPage } from "@/components/day-detail-dialog";
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
 * cũ — và chuỗi đóng lại thì sheet mở lại đúng loại đó.
 *
 * Mở lại KHÔNG tải lại nếu không có gì đổi: danh sách đã tải của mỗi loại (kể cả
 * các trang "Xem thêm") được nhớ trong `cacheRef`, khoá theo `rows` — prop đến
 * từ server. Mọi lần ghi/sửa/xoá đều `revalidatePath("/reports")` (người khác
 * sửa thì `LedgerLiveRefresh` làm mới trang), nên trang được vẽ lại, `rows` đổi
 * identity và sổ nhớ bị vứt ở lần dùng kế tiếp — y như sheet một ngày của lịch.
 * Lúc đó mới tải lại, và tải ĐỦ số khoản đã hiện (`shownRef`): đã "Xem thêm" tới
 * trang 3 thì không rơi về trang đầu.
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
  // Tiêu đề đọc số tiền từ `rows` MỚI NHẤT: vừa sửa một khoản thì tổng của loại
  // phải đổi theo. Loại không còn khoản nào thì không còn trong `rows` — về 0.
  const current = picked && (rows.find((r) => r.id === picked.id) ?? { ...picked, value: 0 });
  const actions = useTransactionActions({
    groupId,
    categories,
    members,
    currentUserId,
    // "Ghi lại khoản này" mở hộp thoại ghi khoản — sheet không được bật lại cùng lúc.
    onHandOff: () => setPicked(null),
  });
  const cacheRef = useRef<{ key: unknown; map: Map<string, TransactionPage> }>({
    key: rows,
    map: new Map(),
  });
  /** Sổ nhớ của lần vẽ này — `rows` đã đổi (trang vừa vẽ lại từ server) thì bỏ sổ cũ. */
  function cache() {
    if (cacheRef.current.key !== rows) cacheRef.current = { key: rows, map: new Map() };
    return cacheRef.current.map;
  }
  const shownRef = useRef(new Map<string, number>());
  const keyOf = (row: CategoryRow) => row.id ?? "none";

  // `rows` đổi trong lúc sheet đang mở (chuỗi sửa vừa đóng mà dữ liệu mới về
  // chậm hơn một nhịp, hay người khác trong sổ vừa sửa) thì dựng lại sheet: nó
  // sẽ thấy sổ nhớ đã trống và tải lại, thay vì giữ danh sách cũ.
  const [seenRows, setSeenRows] = useState(rows);
  const [gen, setGen] = useState(0);
  if (seenRows !== rows) {
    setSeenRows(rows);
    setGen((g) => g + 1);
  }

  function filterFor(row: CategoryRow): TransactionFilter {
    return {
      ...range,
      type,
      ...(row.id ? { categoryIds: [row.id] } : { uncategorized: true }),
    };
  }
  const fetchPage = (row: CategoryRow, cursor?: string, take?: number) =>
    call(loadTransactions(groupId, filterFor(row), cursor, take)).then((res) => ({
      ...res,
      items: res.items as unknown as TransactionItem[],
    }));

  function pick(row: CategoryRow) {
    setPicked(row);
  }

  return (
    <>
      <CategoryBarList rows={rows} total={total} limit={limit} onPick={pick} />

      {current && !actions.active && (
        <CategoryTransactionsDialog
          key={`${keyOf(current)}:${gen}`}
          row={current}
          type={type}
          rangeLabel={rangeLabel}
          members={members}
          cached={() => cache().get(keyOf(current))}
          load={() => {
            const shown = shownRef.current.get(keyOf(current)) ?? 0;
            return fetchPage(current, undefined, shown > 0 ? Math.min(shown, 500) : undefined);
          }}
          loadMore={(cursor) => fetchPage(current, cursor)}
          onLoaded={(page) => {
            cache().set(keyOf(current), page);
            shownRef.current.set(keyOf(current), page.items.length);
          }}
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
  cached,
  load,
  loadMore,
  onOpenChange,
  onPick,
  onLoaded,
}: {
  row: CategoryRow;
  type: "INCOME" | "EXPENSE";
  rangeLabel: string;
  members: MemberOption[];
  /** Danh sách đã tải lần trước và chưa có gì đổi — có thì hiện ngay, không tải. */
  cached: () => TransactionPage | undefined;
  load: () => Promise<TransactionPage>;
  loadMore: (cursor: string) => Promise<TransactionPage>;
  onOpenChange: (open: boolean) => void;
  onPick: (t: TransactionItem) => void;
  /** Mỗi lần danh sách đổi (tải xong, "Xem thêm") — để chủ sheet nhớ lại. */
  onLoaded: (page: TransactionPage) => void;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | ({ status: "done" } & TransactionPage)
  >(() => {
    const hit = cached();
    return hit ? { status: "done", ...hit } : { status: "loading" };
  });

  // Mount = vừa mở loại này (có `key` theo loại ở phía trên), nên tải nhiều nhất
  // một lần — và không lần nào nếu sổ nhớ đã có sẵn.
  useEffect(() => {
    if (state.status !== "loading") return;
    let alive = true;
    load()
      .then((res) => alive && setState({ status: "done", ...res }))
      .catch((e: Error) => alive && setState({ status: "error", message: e.message }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pending, start] = useTransition();
  useEffect(() => {
    if (state.status === "done") onLoaded({ items: state.items, nextCursor: state.nextCursor });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function more() {
    if (state.status !== "done" || !state.nextCursor) return;
    const cursor = state.nextCursor;
    start(async () => {
      try {
        const page = await loadMore(cursor);
        setState((prev) =>
          prev.status === "done"
            ? { ...prev, items: [...prev.items, ...page.items], nextCursor: page.nextCursor }
            : prev
        );
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

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
            {state.status === "done" && ` · ${state.items.length}${state.nextCursor ? "+" : ""} khoản`}
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
              {state.nextCursor && <LoadMoreButton pending={pending} onClick={more} />}
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
