"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowRight, ChevronDown, History } from "lucide-react";
import { toast } from "sonner";
import { call } from "@/lib/action-result";
import { loadSettlements } from "@/lib/actions";
import { memberLabel, type MemberOption } from "@/lib/member";
import { DeleteSettlementButton, EditSettlementButton } from "@/components/settle-actions";
import { Button } from "@/components/ui/button";
import { dateKey, formatDate, formatMoney } from "@/lib/utils";

type User = { id: string; name: string | null; image: string | null; email: string | null };

export type SettlementItem = {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  date: Date;
  note: string | null;
  version: number;
  from: User;
  to: User;
};

/**
 * "Những lần đã đưa tiền" — gập lại, phân trang bằng con trỏ.
 *
 * Trước đây trang tải MỌI lần đưa tiền của sổ trong một lượt; sổ dùng vài năm là
 * vài trăm dòng mà gần như chẳng ai mở khối này ra. Nay trang đầu đến từ server,
 * các trang sau giữ ở client — cùng cách với danh sách chính (`TransactionList`),
 * kể cả chỗ nạp lại ĐỦ số dòng đã hiện khi trang đầu đổi (sửa/xoá một lần đưa
 * tiền là `revalidatePath`, trang đầu mới về, các trang sau phải theo kịp).
 */
export function SettlementHistory({
  groupId,
  userId,
  members,
  items: firstPage,
  nextCursor: firstCursor,
  count,
}: {
  groupId: string;
  userId: string;
  members: MemberOption[];
  items: SettlementItem[];
  nextCursor: string | null;
  /** Tổng số lần đưa tiền của sổ, không phải của trang đầu. */
  count: number;
}) {
  const [older, setOlder] = useState<SettlementItem[]>([]);
  const [cursor, setCursor] = useState(firstCursor);
  const [pending, start] = useTransition();

  const loaded = useRef(0);
  useEffect(() => {
    loaded.current = older.length;
  }, [older]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const n = loaded.current;
    let stale = false;
    void (async () => {
      if (!firstCursor || n === 0) {
        // Trang đầu mới đã chứa hết, hoặc chưa tải thêm trang nào: chỉ cần đi theo nó.
        setOlder([]);
        setCursor(firstCursor);
        return;
      }
      const res = await loadSettlements(groupId, firstCursor, Math.min(n, 500));
      // Lỗi thì giữ nguyên thứ đang hiện: lệch vài dòng còn hơn trắng cả đoạn.
      if (stale || !res.ok) return;
      setOlder(res.data.items as unknown as SettlementItem[]);
      setCursor(res.data.nextCursor);
    })();
    return () => {
      stale = true;
    };
  }, [firstPage, firstCursor, groupId]);

  const items = useMemo(() => {
    const seen = new Set<string>();
    return [...firstPage, ...older].filter((s) => !seen.has(s.id) && !!seen.add(s.id));
  }, [firstPage, older]);

  function loadMore() {
    if (!cursor) return;
    start(async () => {
      try {
        const page = await call(loadSettlements(groupId, cursor));
        setOlder((prev) => [...prev, ...(page.items as unknown as SettlementItem[])]);
        setCursor(page.nextCursor);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  const name = (u: User) => (u.id === userId ? "Bạn" : memberLabel(u));

  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
        <History className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 text-body-lg">
          Những lần đã đưa tiền
          <span className="text-body text-muted-foreground"> · {count}</span>
        </span>
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      {items.length === 0 ? (
        <p className="border-t border-border px-4 py-4 text-body text-muted-foreground">
          Chưa ghi lần đưa tiền nào.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 pl-4 pr-2">
              <div className="min-w-0 flex-[1_1_10rem]">
                <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-body">
                  <span className="truncate">{name(s.from)}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="sr-only">đưa cho</span>
                  <span className="truncate">{name(s.to)}</span>
                </p>
                <p className="text-caption text-muted-foreground">
                  {formatDate(new Date(s.date))}
                  {s.note ? ` · ${s.note}` : ""}
                </p>
              </div>
              <span className="ml-auto flex shrink-0 items-center gap-1">
                <span className="num mr-1 text-body font-semibold">{formatMoney(s.amount)}</span>
                <EditSettlementButton
                  groupId={groupId}
                  members={members}
                  settlementId={s.id}
                  settlementVersion={s.version}
                  draft={{
                    fromUserId: s.fromUserId,
                    toUserId: s.toUserId,
                    amount: s.amount,
                    date: dateKey(new Date(s.date)),
                    note: s.note,
                  }}
                />
                <DeleteSettlementButton
                  settlementId={s.id}
                  settlementVersion={s.version}
                  amount={s.amount}
                  fromName={memberLabel(s.from)}
                  toName={memberLabel(s.to)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
      {cursor && (
        <div className="border-t border-border p-2">
          <Button variant="ghost" className="w-full text-primary" disabled={pending} onClick={loadMore}>
            {pending ? "Đang tải…" : "Xem những lần cũ hơn"}
          </Button>
        </div>
      )}
    </details>
  );
}
