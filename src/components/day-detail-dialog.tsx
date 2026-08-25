"use client";
import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Plus } from "lucide-react";
import { loadDayTransactions } from "@/lib/actions";
import { memberLabel, type MemberOption } from "@/lib/member";
import { TransactionAmount, type TransactionItem } from "@/components/transaction-list";
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
import { rowLeadClass, rowTextClass, rowTrailClass } from "@/components/ui/row";
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
 * Sheet CHỈ ĐỌC, không mở được chi tiết từng khoản: hàng bấm được ở đây sẽ phải
 * mở dialog thứ hai chồng lên dialog này, mà Radix khoá tiêu điểm ở cái cũ (xem
 * ghi chú trong `transaction-list.tsx`). Muốn sửa/xoá thì vào khoản đó từ danh
 * sách bên dưới — sheet này để trả lời "hôm đó tiêu những gì", không phải để
 * thao tác.
 *
 * NGOẠI LỆ DUY NHẤT: nút "Ghi khoản cho ngày này" ở chân sheet. Đây là đường
 * NGẮN NHẤT để ghi một khoản cho ngày khác hôm nay — chọn ngày trên lịch, nơi
 * thứ và ngày hiện ra thành một ô nhìn thấy được, thay vì lăn bàn phím ngày của
 * hệ điều hành trong form. Nó ĐÓNG sheet này rồi mới mở hộp thoại ghi khoản
 * (`openQuickAdd`), đúng luật "không chồng hai dialog" ở trên.
 */
export function DayDetailDialog({
  groupId,
  day,
  filter,
  members,
  open,
  onOpenChange,
}: {
  groupId: string;
  /** Ngày đang xem, "2026-08-05". */
  day: string;
  /** Bộ lọc chiều/loại/tìm kiếm đang bật của trang — sheet phải đếm cùng tập. */
  filter: { type?: "INCOME" | "EXPENSE"; categoryId?: string; q?: string };
  members: MemberOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | {
        status: "done";
        items: TransactionItem[];
        hasMore: boolean;
        income: number;
        expense: number;
      }
  >({ status: "loading" });

  // Tải MỘT LẦN khi mount. Sheet chỉ được dựng lúc mở và có `key` theo ngày ở
  // phía lịch, nên "mount" ở đây chính là "vừa mở ngày này" — đóng rồi mở lại
  // là tải lại từ đầu, cố ý: lần mở lại thường là sau khi vừa ghi thêm một
  // khoản, và một danh sách cũ ở đây trông giống hệt một khoản bị mất.
  useEffect(() => {
    let alive = true;
    loadDayTransactions(groupId, day, filter)
      .then((res) => {
        if (!alive) return;
        setState({
          status: "done",
          items: res.items as unknown as TransactionItem[],
          hasMore: res.hasMore,
          income: res.income,
          expense: res.expense,
        });
      })
      .catch((e: Error) => {
        if (alive) setState({ status: "error", message: e.message });
      });
    return () => {
      alive = false;
    };
    // Cố ý chạy đúng một lần cho mỗi lần mở — `filter` là object mới ở mỗi lần
    // render của trang, và nó không đổi được trong lúc sheet đang mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shared = members.length > 1;
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
                ? `${state.items.length} khoản trong ngày`
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
                    <DayRow key={t.id} t={t} shared={shared} />
                  ))}
                </div>
              )}

              {/* Một ngày dài hơn một trang là chuyện hiếm, nhưng khi xảy ra thì
                  phải NÓI RA — im lặng cắt bớt là để người dùng đếm nhầm. */}
              {state.hasMore && (
                <p className="text-caption text-muted-foreground">
                  Ngày này còn nhiều khoản hơn nữa — xem đủ ở danh sách bên dưới lịch.
                </p>
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
        {inbound ? <ArrowDownCircle className="size-4" /> : <ArrowUpCircle className="size-4" />}
        {label}
      </div>
      <div className="num mt-0.5 text-money-row text-foreground">{formatMoney(value)}</div>
    </div>
  );
}

/** Một khoản trong sheet — cùng dáng hàng của danh sách, nhưng KHÔNG bấm được. */
function DayRow({ t, shared }: { t: TransactionItem; shared: boolean }) {
  const inbound = t.type === "INCOME";
  const payer = t.paidBy ?? t.createdBy;
  const note = [
    shared ? `${memberLabel({ ...payer, image: null })} ${inbound ? "cầm tiền" : "bỏ tiền"}` : null,
    shared && t.splits.length > 1 ? `chia ${t.splits.length} người` : null,
    t.note,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-h-16 w-full flex-wrap items-center gap-x-3.5 gap-y-1 px-4 py-3 text-left">
      <div className={rowLeadClass}>
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-lg text-title",
            inbound ? "bg-income-surface" : "bg-sunken"
          )}
        >
          {t.categories[0]?.category.icon ?? (inbound ? "💵" : "📦")}
        </span>
        <div className={rowTextClass}>
          <div className="truncate text-body-lg">{categoryLabel(t)}</div>
          {note && <div className="truncate text-caption text-muted-foreground">{note}</div>}
        </div>
      </div>
      <span className={rowTrailClass}>
        <TransactionAmount amount={t.amount} amountUnknown={t.amountUnknown} type={t.type} />
      </span>
    </div>
  );
}
