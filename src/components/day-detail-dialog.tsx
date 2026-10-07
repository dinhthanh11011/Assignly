"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Plus } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { UNKNOWN_AMOUNT_LONG, signedMoney } from "@/lib/copy";
import { makeShortNamer, type MemberOption } from "@/lib/member";
import {
  CategoryTile,
  TransactionAmount,
  TransactionRowText,
  type TransactionItem,
} from "@/components/transaction-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openQuickAdd } from "@/lib/quick-add";
import { rowLeadClass, rowTrailClass } from "@/components/ui/row";
import { Skeleton } from "@/components/ui/skeleton";
import {
  categoryLabel,
  cn,
  dateKey,
  formatDate,
  formatMoney,
  formatWeekday,
  today,
} from "@/lib/utils";

/** Ruột của một ngày: trang đầu các khoản + hai con số của CẢ ngày. */
export type DayData = {
  items: TransactionItem[];
  /** Còn trang sau — sheet hiện nút "Xem thêm". */
  nextCursor: string | null;
  income: number;
  expense: number;
};

/** Một trang tiếp theo của một danh sách khoản. */
export type TransactionPage = { items: TransactionItem[]; nextCursor: string | null };

/**
 * MỘT NGÀY TRONG SỔ, mở ra khi bấm một ô lịch.
 *
 * Đây là thứ THAY THẾ cách cũ: bấm ô lịch thì thêm `?day=` vào URL và danh sách
 * bên dưới thu về đúng ngày đó. Cách cũ hỏng ở ba chỗ:
 *   · câu trả lời hiện ra ở NGOÀI TẦM MẮT — ô lịch nằm trên, danh sách nằm dưới
 *     một màn hình, người dùng bấm xong thấy trang "không đổi gì";
 *   · nó ĐÈ LÊN việc đang làm: đang lọc/sắp xếp danh sách cả tháng, lỡ tay chạm
 *     một ô lịch là mất hết ngữ cảnh, phải đi tìm chip "Chỉ ngày…" để gỡ ra;
 *   · và nó tốn một lượt vòng server cho mỗi lần tò mò một ngày.
 * Sheet thì trả lời ngay tại chỗ vừa bấm, đóng lại là mọi thứ y như cũ.
 *
 * BẤM MỘT HÀNG LÀ MỞ CHI TIẾT KHOẢN ĐÓ — y như bấm một hàng ở danh sách chính,
 * và từ chi tiết đi tiếp ra sửa / xoá / điền số tiền. Bản trước để sheet CHỈ ĐỌC
 * vì hàng bấm được sẽ mở dialog thứ hai CHỒNG LÊN dialog này, mà hai Radix dialog
 * cùng mở thì tiêu điểm khoá ở cái cũ và cái mới không bấm được. Cái giá của lựa
 * chọn đó là người dùng thấy đúng khoản cần sửa ngay trước mắt mà vẫn phải đóng
 * sheet, cuộn xuống danh sách tháng, rồi đi tìm lại nó giữa những ngày khác.
 *
 * Nay sheet không tự mở dialog con: nó chỉ BÁO RA (`onPick`) khoản vừa bấm, còn
 * lịch — chủ của sheet này — đóng sheet lại rồi mới mở chuỗi chi tiết
 * (`useTransactionActions`), và mở lại sheet khi chuỗi đóng. Không lúc nào có
 * hai dialog cùng mở, mà người dùng vẫn quay về đúng ngày đang xem.
 *
 * Nút "Ghi khoản cho ngày này" ở chân sheet đi theo đúng luật đó. Đây là đường
 * NGẮN NHẤT để ghi một khoản cho ngày khác hôm nay — chọn ngày trên lịch, nơi
 * thứ và ngày hiện ra thành một ô nhìn thấy được, thay vì lăn bàn phím ngày của
 * hệ điều hành trong form. Nó ĐÓNG sheet này rồi mới mở hộp thoại ghi khoản
 * (`openQuickAdd`), đúng luật "không chồng hai dialog" ở trên.
 */
export function DayDetailDialog({
  day,
  initial,
  load,
  loadMore,
  members,
  open,
  onOpenChange,
  onPick,
  onShown,
}: {
  /** Ngày đang xem, "2026-08-05". */
  day: string;
  /**
   * Ruột của ngày này khi NGƯỜI GỌI ĐÃ CÓ SẴN — lúc đó sheet mở ra là thấy ngay,
   * không có nhịp xương trắng và không tốn lượt đi/về server nào. Xem
   * `month-calendar.tsx`: lịch đã cầm sẵn 30 khoản đầu của tháng, nên phần lớn
   * các ngày được mở là nó dựng thẳng từ chỗ đó.
   */
  initial?: DayData | null;
  /** Đi hỏi server ruột của ngày này — chỉ gọi khi không có `initial`. */
  load: () => Promise<DayData>;
  /** Trang sau của ngày này, đọc từ `nextCursor`. */
  loadMore: (cursor: string) => Promise<TransactionPage>;
  members: MemberOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Vừa bấm một khoản — chủ sheet đóng sheet rồi mở chi tiết khoản đó. */
  onPick: (t: TransactionItem) => void;
  /**
   * Số khoản đang hiện — để chủ sheet nạp lại ĐỦ ngần ấy khi mở lại sau khi xem
   * một khoản, thay vì rơi về trang đầu.
   */
  onShown?: (n: number) => void;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | ({ status: "done" } & DayData)
  >(initial ? { status: "done", ...initial } : { status: "loading" });

  // Chỉ đi hỏi server khi người gọi KHÔNG đưa sẵn ruột của ngày. Sheet được dựng
  // lúc mở và có `key` theo ngày ở phía lịch, nên "mount" ở đây chính là "vừa mở
  // ngày này".
  //
  // Lần mở lại một ngày không còn luôn là một lượt đi/về server nữa: `load` do
  // lịch giữ, và lịch nhớ kết quả cho tới khi trang được vẽ lại từ server (mọi
  // lần sửa/xoá/ghi thêm đều `revalidatePath("/")`, tức là vẽ lại). Nhờ vậy
  // "đóng sheet rồi mở lại", hay "xem một khoản rồi quay ra", không phải chờ
  // thêm lần nào — mà vẫn không bao giờ hiện lại một danh sách đã cũ.
  useEffect(() => {
    if (initial) return;
    let alive = true;
    load()
      .then((res) => {
        if (alive) setState({ status: "done", ...res });
      })
      .catch((e: Error) => {
        if (alive) setState({ status: "error", message: e.message });
      });
    return () => {
      alive = false;
    };
    // Cố ý chạy đúng một lần cho mỗi lần mở: `load` là closure mới ở mỗi lần
    // render của lịch, và ngày đang xem không đổi được trong lúc sheet đang mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pending, start] = useTransition();
  const shown = state.status === "done" ? state.items.length : 0;
  useEffect(() => {
    if (shown > 0) onShown?.(shown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

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
  const isToday = day === dateKey(today());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {formatWeekday(day)}, {formatDate(day)}
            {isToday && " (hôm nay)"}
          </DialogTitle>
          <DialogDescription>
            {state.status === "done"
              ? state.items.length > 0
                ? `${state.items.length}${state.nextCursor ? "+" : ""} khoản trong ngày`
                : "Ngày này chưa ghi khoản nào."
              : "Đang mở sổ của ngày này…"}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {state.status === "loading" && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {state.status === "error" && (
            <p className="text-body text-expense">{state.message}</p>
          )}

          {state.status === "done" && (
            <>
              <DayStats
                income={state.income}
                expense={state.expense}
                items={state.items}
              />

              {state.items.length > 0 && (
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {state.items.map((t) => (
                    <DayRow
                      key={t.id}
                      t={t}
                      shared={shared}
                      shortName={shortName}
                      onPick={() => onPick(t)}
                    />
                  ))}
                </div>
              )}

              {state.nextCursor && (
                <LoadMoreButton pending={pending} onClick={more} />
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              // Đóng trước, mở sau — cùng một lượt cập nhật, xem ghi chú ở đầu file.
              onOpenChange(false);
              openQuickAdd({ date: day });
            }}
          >
            <Plus />
            {isToday ? "Ghi khoản cho hôm nay" : "Ghi khoản cho ngày này"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Thống kê nhẹ của ngày: hai con số của ngày, kết quả trong ngày, và khoản chi
 * lớn nhất. Đủ để trả lời "hôm đó thế nào" mà không phải đọc hết từng hàng —
 * nhiều hơn nữa thì đã là việc của trang Báo cáo.
 */
function DayStats({
  income,
  expense,
  items,
}: {
  income: number;
  expense: number;
  items: TransactionItem[];
}) {
  if (items.length === 0) return null;

  const net = income - expense;
  const biggest = items
    .filter((t) => t.type === "EXPENSE")
    .reduce<TransactionItem | null>((top, t) => (t.amount > (top?.amount ?? 0) ? t : top), null);
  const unknownCount = items.filter((t) => t.amountUnknown).length;

  return (
    <div className="space-y-2.5">
      {/* @container + ngưỡng em: ở màn hẹp × cỡ chữ lớn hai ô này không đủ chỗ
          cho hai con số đầy đủ, và con số mới là thứ không được cắt. */}
      <div className="@container grid grid-cols-1 gap-2.5 @min-[19em]:grid-cols-2">
        <Figure label="Tiền vào" value={income} tone="in" />
        <Figure label="Tiền ra" value={expense} tone="out" />
      </div>

      <p className="text-body">
        Trong ngày{" "}
        {net >= 0 ? (
          <>
            còn dư <span className="num text-income">{formatMoney(net)}</span>
          </>
        ) : (
          <>
            hụt <span className="num text-expense">{formatMoney(-net)}</span>
          </>
        )}
        {biggest && (
          <>
            {" · "}
            Chi nhiều nhất {categoryLabel(biggest)}{" "}
            <span className="num text-expense">{formatMoney(biggest.amount)}</span>
          </>
        )}
      </p>

      {/* Không có dòng này thì một ngày chỉ gồm khoản chưa điền tiền đọc ra thành
          "còn dư 0 ₫" ngay bên trên mấy hàng ghi rõ có tiêu — hai câu chọi nhau, và
          người dùng tin cái nào cũng sai. Nó nói ra chỗ hụt: hai con số trên là
          thật, chỉ là chưa đủ. */}
      {unknownCount > 0 && (
        <p className="text-caption text-warning">
          Còn {unknownCount} khoản chưa điền số tiền, chưa được tính vào hai con số
          trên.
        </p>
      )}
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: number; tone: "in" | "out" }) {
  const inbound = tone === "in";
  return (
    <div
      className={cn(
        "rounded-lg px-3.5 py-2.5",
        inbound ? "bg-income-surface" : "bg-expense-surface"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-label",
          inbound ? "text-income" : "text-expense"
        )}
      >
        {inbound ? <ArrowDownLeft className="size-4" aria-hidden /> : <ArrowUpRight className="size-4" aria-hidden />}
        {label}
      </div>
      <Amount value={inbound ? value : -value} tone={inbound ? "income" : "expense"} className="mt-0.5" />
    </div>
  );
}

/**
 * Một khoản trong sheet — cùng dáng hàng của danh sách chính, và cũng bấm được y
 * như ở đó. CẢ HÀNG là một nút: mục tiêu bấm rộng bằng sheet, không phải một cái
 * "⋮" nhỏ ở góc phải.
 */
export function DayRow({
  t,
  shared,
  shortName,
  dateLabel,
  onPick,
}: {
  t: TransactionItem;
  shared: boolean;
  shortName: (m: { id: string; name: string | null; email: string | null }) => string;
  /** Ngày của khoản — chỉ truyền khi danh sách trải qua nhiều ngày (sheet một loại ở báo cáo). */
  dateLabel?: string;
  onPick: () => void;
}) {
  const inbound = t.type === "INCOME";

  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Xem chi tiết khoản ${categoryLabel(t)}, ${
        t.amountUnknown ? UNKNOWN_AMOUNT_LONG : signedMoney(t.amount, inbound ? "in" : "out")
      }`}
      className="focus-ring-inset flex min-h-16 w-full flex-wrap items-center gap-x-3.5 gap-y-1 px-4 py-3 text-left transition-colors duration-150 hover:bg-sunken">
      <div className={rowLeadClass}>
        <CategoryTile t={t} />
        {/* Cùng ruột chữ với danh sách chính: hai chỗ vẽ cùng một khoản thì phải
            cắt chữ theo cùng một luật, nếu không sheet và danh sách nói khác nhau
            về đúng một hàng. */}
        <TransactionRowText t={t} shared={shared} shortName={shortName} dateLabel={dateLabel} />
      </div>
      {/* Mũi tên nói "bấm được, còn nữa ở trong" — luôn hiện, kể cả khi không rê
          chuột, vì điện thoại không có hover. */}
      <span className={cn(rowTrailClass, "self-start")}>
        <TransactionAmount amount={t.amount} amountUnknown={t.amountUnknown} type={t.type} />
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      </span>
    </button>
  );
}

/** Nút "Xem thêm" của các sheet danh sách khoản (một ngày, một loại ở báo cáo). */
export function LoadMoreButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <Button variant="outline" className="w-full" disabled={pending} onClick={onClick}>
      {pending ? "Đang tải…" : "Xem thêm"}
    </Button>
  );
}
